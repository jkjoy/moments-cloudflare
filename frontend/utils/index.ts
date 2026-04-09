import type { ResultVO, SysConfigVO } from "~/types";
import { toast } from "vue-sonner";
import { useGlobalState } from "~/composables/useGlobalState";
import { API_BASE } from "~/utils/api-base";

const global = useGlobalState();

export const useMyFetch = async <T>(url: string, data?: any) => {
  const headers: Record<string, string> = {};

  const userinfo = global.value.userinfo;
  if (userinfo.token) {
    headers["x-api-token"] = userinfo.token;
  }

  const res = await $fetch<ResultVO<T>>(`${API_BASE}/api${url}`, {
    method: "post",
    body: data ? JSON.stringify(data) : null,
    headers: headers,
  });

  if (!res || res.code !== 0) {
    if (!res) {
      throw new Error("请求失败");
    }

    if (res.code === 3 || res.code === 4) {
      global.value.userinfo = {};
      window.location.href = "/";
      throw new Error(res.message || "请求失败");
    }

    throw new Error(res.message);
  }

  return res.data;
};

type OnProgressCallback = (progress: number) => void;

type OnTotalProgressCallback = (
  totalCount: number,
  currentCount: number,
  name: string,
  progress: number
) => void;

// Simplified upload to R2 only (removed S3 logic)
const uploadFile2R2WithProgress = (
  url: string,
  file: File,
  onProgress: OnProgressCallback
): Promise<{ url: string }> =>
  new Promise<{ url: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.addEventListener("load", () => {
      const res = JSON.parse(xhr.responseText);
      if (!res || res.code !== 0) {
        return reject(new Error(`${res?.message || "请求失败"}`));
      }

      resolve(res.data);
    });
    xhr.addEventListener("error", () => reject(new Error("File upload failed")));
    xhr.addEventListener("abort", () =>
      reject(new Error("File upload aborted"))
    );
    xhr.upload.addEventListener("progress", (e) =>
      onProgress(e.loaded / e.total)
    );

    xhr.open("POST", url, true);

    const userinfo = global.value.userinfo;
    if (userinfo.token) {
      xhr.setRequestHeader("x-api-token", userinfo.token);
    }

    const formData = new FormData();
    formData.append("file", file);

    xhr.send(formData);
  });

const uploadFile2R2 = async (
  files: FileList,
  onProgress?: OnTotalProgressCallback
): Promise<string[]> => {
  const result: string[] = [];

  for (let i = 0; i < files.length; i++) {
    try {
      const file = files[i];
      const uploadResult = await uploadFile2R2WithProgress(
        `${API_BASE}/api/file/upload`,
        file,
        (progress) => {
          if (onProgress) {
            onProgress(files.length, i + 1, file.name, progress);
          }
        }
      );

      if (!uploadResult.url) {
        toast.error(`上传图片失败`);
        continue;
      }

      // 如果是相对路径，拼接上后端域名
        const fullUrl = uploadResult.url.startsWith('/')
          ? `${API_BASE}${uploadResult.url}`
          : uploadResult.url;

        result.push(fullUrl);
    } catch (e) {
      toast.error(`上传图片失败, ${e}`);
    }
  }

  return result;
};

// Simplified upload function - always use R2
export const useUpload = async (
  files: FileList,
  onProgress?: OnTotalProgressCallback
): Promise<string[]> => {
  if (files.length === 0) {
    toast.error("没有选择文件");
    return [];
  }

  return uploadFile2R2(files, onProgress);
};
