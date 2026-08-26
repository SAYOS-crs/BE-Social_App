import { Router } from "express";
import postService from "./post.service";

const router: Router = Router();

router.post("/create", postService.createPost);

export default router;
