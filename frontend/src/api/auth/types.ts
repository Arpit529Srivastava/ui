export type LoginDetails = {
  username: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  user: {
    permissions: string[];
    username: string;
  };
};

export type ApiResponse<T> = {
  data: T;
  message: string;
  status: number;
};
// this is just to check playwright testing workflow
export type VerifyTokenResponse = {
  permissions: string[];
  username: string;
};
