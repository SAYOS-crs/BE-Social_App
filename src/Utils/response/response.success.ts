import { Response } from "express";

function SuccessResponse<T>({
  res,
  message = "done",
  data,
  status = 200,
}: {
  res: Response;
  message?: string;
  data?: T;
  status?: number;
}): Response {
  return res.status(status).json({ message, data });
}

export default SuccessResponse;
