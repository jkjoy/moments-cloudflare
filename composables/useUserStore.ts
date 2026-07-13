import type { User } from '~/types';

export const useUserStore = () => {
  const currentUser = useState<User | null>('currentUser', () => null);
  const api = useApi();

  const login = async (username: string, password: string) => {
    const result = await api.post<{ token: string; username: string; id: number }>(
      '/api/user/login',
      { username, password }
    );

    if (result.code === 0 && result.data) {
      api.setToken(result.data.token);
      await fetchProfile();
      return true;
    }
    return false;
  };

  const logout = () => {
    api.setToken(null);
    currentUser.value = null;
  };

  const fetchProfile = async () => {
    const result = await api.post<User>('/api/user/profile');
    if (result.code === 0 && result.data) {
      currentUser.value = result.data;
    }
  };

  const register = async (username: string, password: string, repeatPassword: string) => {
    const result = await api.post('/api/user/reg', {
      username,
      password,
      repeatPassword,
    });
    return result.code === 0;
  };

  const isLoggedIn = computed(() => !!currentUser.value);

  return {
    currentUser,
    login,
    logout,
    fetchProfile,
    register,
    isLoggedIn,
  };
};
