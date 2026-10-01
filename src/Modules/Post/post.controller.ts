import { Request, Response, Router } from "express";

import { HPostDocument } from "../../DB/models/Post.model";
import { HUserDocument, IUser } from "../../DB/models/User.model";
import {
  Authentication,
  Authorization,
  CloudFileUpload,
} from "../../Middlewares";
import Validation from "../../Middlewares/Validation.middleware";
import {
  AllowedFileTypes,
  BadRequstExption,
  FileFilter,
  NotFoundExption,
  Rolle,
  StorageAprotches,
  SuccessResponse,
  TokenType,
  UnAuthroizedExption,
} from "../../Utils";
import { CommentRouter } from "../Comment";
import {
  I_CreatePost_dto,
  I_PostReact_params_dto,
  I_PostReact_query_dto,
  I_RetrievePost_Query_dto,
  RetrievePost_dto,
} from "./post.dto";
import postService from "./post.service";
import {
  PostReactValidationSchema,
  PostValidationSchema,
  RetrievePostValidationSchema,
} from "./post.validation";

const router: Router = Router();

const GetAuthenticatedUser = (req: Request): HUserDocument => {
  if (!req.user) {
    throw new UnAuthroizedExption("User is not authenticated");
  }
  return req.user;
};

// -------\\// -------\\// -------\\// -------\\// -------\\// -------\\
// retrieve post - posts
router.get(
  "/{:postId}",
  Authentication(TokenType.Access),
  Authorization([Rolle.User, Rolle.Admin]),
  Validation(RetrievePostValidationSchema),
  async (req: Request, res: Response): Promise<RetrievePost_dto | void> => {
    const { postId }: Partial<{ postId: string | undefined }> = req.params;

    const user = GetAuthenticatedUser(req);
    const { page, limit }: I_RetrievePost_Query_dto = req.query;
    const data = await postService.retrievePosts({ limit, page, user, postId });

    if (!data) {
      throw new NotFoundExption("post not found!", data);
    }

    SuccessResponse({ res, message: "done", data });
  },
);
// -------\\// -------\\// -------\\// -------\\// -------\\// -------\\
// create post
router.post(
  "/create",
  Authentication(TokenType.Access),
  Authorization([Rolle.User, Rolle.Admin]),
  CloudFileUpload({
    StorageAprotch: StorageAprotches.Memory,
    maxSize: 5,
  }).array("attachments", 5),
  FileFilter(AllowedFileTypes.photo),
  Validation(PostValidationSchema),

  async (req: Request, res: Response): Promise<HPostDocument | void> => {
    const user = GetAuthenticatedUser(req);
    const { content, files, tags, visibility }: I_CreatePost_dto = req.body;
    const data = await postService.createPost({
      user,
      content,
      files,
      tags,
      visibility,
    });
    if (!data) {
      throw new BadRequstExption("Error while creating post !");
    }

    SuccessResponse({ res, data });
  },
);
// -------\\// -------\\// -------\\// -------\\// -------\\// -------\\

router.put(
  "/react/:postId",
  Authentication(TokenType.Access),
  Authorization([Rolle.User, Rolle.Admin]),
  Validation(PostReactValidationSchema),
  async (req: Request, res: Response): Promise<void> => {
    const user: IUser = GetAuthenticatedUser(req);
    const { react } = req.query as unknown as I_PostReact_query_dto;
    const { postId } = req.params as I_PostReact_params_dto;
    const data = await postService.reactOnPost({ postId, react, user });

    if (!data) {
      throw new BadRequstExption("error while reacting on post !");
    }

    SuccessResponse({
      res,
      message: "user react on post successfly",
    });
  },
);

// ------// Comment SupRouter // ------//
router.use("/:PostId/comment", CommentRouter);
// ------//// ------//// ------//// ------//// ------//

export default router;
