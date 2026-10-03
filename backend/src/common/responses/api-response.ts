export interface ApiSuccessResponse<T> {
  code: 0;
  message: 'success';
  data: T;
}

export function wrapApiSuccessResponse<T>(data: T): ApiSuccessResponse<T> {
  return {
    code: 0,
    message: 'success',
    data,
  };
}
