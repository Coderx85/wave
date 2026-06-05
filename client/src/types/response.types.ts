type SuccessResponse<T> = {
  ok: true;
  status: number;
  message: string;
  data: T;
};

type ErrorResponse = {
  ok: false;
  status: number;
  message: string;
  error: string;
};

export type WaveResponse<T> = 
  | SuccessResponse<T> 
  | ErrorResponse;