export type AuthUser = {
  userId: string;
  username: string;
  roleId: number;
  roleName: string;
};

export type PublicUser = {
  id: number;
  fullname: string;
  username: string;
  email: string;
  role: {
    id: number;
    name: string;
  };
};

export type AuthEnv = {
  Variables: {
    authUser: AuthUser;
  };
};