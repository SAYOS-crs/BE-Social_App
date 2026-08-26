import { BaseRepository } from "../DBRepository";
import { HPostDocemnt, PostModel } from "../models/Post.model";

export default class PostRepository extends BaseRepository<HPostDocemnt> {
  constructor() {
    super(PostModel);
  }
}
