type TurnstileRenderOptions = {
  sitekey: string;
  action?: string;
  theme?: 'auto' | 'light' | 'dark';
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    __turnstileLoadPromise__?: Promise<TurnstileApi>;
  }
}

export const useTurnstile = async (): Promise<TurnstileApi> => {
  if (!import.meta.client) {
    throw new Error('Turnstile 只能在浏览器中加载');
  }

  if (window.turnstile) {
    return window.turnstile;
  }

  if (window.__turnstileLoadPromise__) {
    return window.__turnstileLoadPromise__;
  }

  window.__turnstileLoadPromise__ = new Promise<TurnstileApi>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-turnstile-script="true"]');

    const finishLoad = () => {
      if (window.turnstile) {
        resolve(window.turnstile);
        return;
      }

      reject(new Error('Turnstile 加载失败'));
    };

    const handleError = () => {
      window.__turnstileLoadPromise__ = undefined;
      reject(new Error('Turnstile 脚本加载失败'));
    };

    if (existingScript) {
      existingScript.addEventListener('load', finishLoad, { once: true });
      existingScript.addEventListener('error', handleError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.setAttribute('data-turnstile-script', 'true');
    script.addEventListener('load', finishLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });
    document.head.appendChild(script);
  });

  return window.__turnstileLoadPromise__;
};
