import { BaseRepository } from "../DBRepository";
import { CommentModel, IComment } from "../models/Comment.model";

export default class CommentRepository extends BaseRepository<IComment> {
  constructor() {
    super(CommentModel);
  }
}
