"""
Forum API — Crowdsourcing, community discussions, and pothole identification.
"""

import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import get_db, ForumPost, ForumComment

router = APIRouter()


class PostCreate(BaseModel):
    title: str
    content: str
    author_name: Optional[str] = "Citizen Reporter"
    category: Optional[str] = "identification"
    severity_tag: Optional[str] = "unverified"
    pothole_id: Optional[str] = None
    image_url: Optional[str] = None


class CommentCreate(BaseModel):
    content: str
    author_name: Optional[str] = "Community Member"


@router.get("/posts")
def get_forum_posts(
    category: Optional[str] = Query("all", description="Category filter"),
    db: Session = Depends(get_db)
):
    """List forum posts with comment counts and upvotes."""
    query = db.query(ForumPost)
    if category and category != "all":
        query = query.filter(ForumPost.category == category)

    posts = query.order_by(desc(ForumPost.created_at)).all()
    results = []
    for p in posts:
        comments_cnt = db.query(ForumComment).filter(ForumComment.post_id == p.id).count()
        results.append(p.to_dict(comments_count=comments_cnt))

    return {"posts": results, "total": len(results)}


@router.post("/posts")
def create_forum_post(
    post_data: PostCreate,
    db: Session = Depends(get_db)
):
    """Create a new crowdsourced discussion post."""
    post_id = str(uuid.uuid4())
    new_post = ForumPost(
        id=post_id,
        title=post_data.title,
        content=post_data.content,
        author_name=post_data.author_name or "Citizen Reporter",
        category=post_data.category or "identification",
        severity_tag=post_data.severity_tag or "unverified",
        pothole_id=post_data.pothole_id,
        image_url=post_data.image_url,
        upvotes=0,
        created_at=datetime.utcnow()
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    return new_post.to_dict(comments_count=0)


@router.get("/posts/{post_id}")
def get_post_detail(post_id: str, db: Session = Depends(get_db)):
    """Get post details along with thread comments."""
    post = db.query(ForumPost).filter(ForumPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    comments = db.query(ForumComment).filter(ForumComment.post_id == post_id).order_by(ForumComment.created_at.asc()).all()
    post_dict = post.to_dict(comments_count=len(comments))
    post_dict["comments"] = [c.to_dict() for c in comments]
    return post_dict


@router.post("/posts/{post_id}/comments")
def add_comment(
    post_id: str,
    comment_data: CommentCreate,
    db: Session = Depends(get_db)
):
    """Add a response/comment to a thread."""
    post = db.query(ForumPost).filter(ForumPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    comment_id = str(uuid.uuid4())
    new_comment = ForumComment(
        id=comment_id,
        post_id=post_id,
        author_name=comment_data.author_name or "Community Member",
        content=comment_data.content,
        created_at=datetime.utcnow()
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    return new_comment.to_dict()


@router.post("/posts/{post_id}/upvote")
def upvote_post(post_id: str, db: Session = Depends(get_db)):
    """Upvote a forum post to increase urgency and community visibility."""
    post = db.query(ForumPost).filter(ForumPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    post.upvotes = (post.upvotes or 0) + 1
    db.commit()
    return {"id": post.id, "upvotes": post.upvotes}
