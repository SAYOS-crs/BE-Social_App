import { Request, Response } from "express";
import { SuccessResponse } from "../../Utils";

class PostService {
  constructor() {}

  public createPost = (req: Request, res: Response): Response => {
    return SuccessResponse<any>({ res, message: "done" });
  };
}

export default new PostService();
