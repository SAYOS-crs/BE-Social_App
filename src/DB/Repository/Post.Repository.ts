import { BaseRepository } from "../DBRepository";
import { IPost, PostModel } from "../models/Post.model";

export default class PostRepository extends BaseRepository<IPost> {
  constructor() {
    super(PostModel);
  }
}
