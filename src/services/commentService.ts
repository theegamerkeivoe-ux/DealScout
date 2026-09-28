import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase';
import { SupportComment } from '../types';
import { OperationType, handleFirestoreError } from './dealService';

const COMMENTS_COLLECTION = 'support_comments';

// Fetch community support comments (ordered by newest first)
export async function getSupportComments(): Promise<SupportComment[]> {
  try {
    const commentsRef = collection(db, COMMENTS_COLLECTION);
    // Simple query without complex composite indexes so it never fails on first load
    const q = query(commentsRef, limit(100));
    const snapshot = await getDocs(q);
    const comments: SupportComment[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      comments.push({
        id: docSnap.id,
        text: data.text || '',
        name: data.name || 'Anonymous Scout',
        dealId: data.dealId || undefined,
        dealTitle: data.dealTitle || undefined,
        merchantName: data.merchantName || undefined,
        createdAt: data.createdAt || new Date().toISOString(),
        status: data.status || 'active',
      });
    });

    // Client-side sort by createdAt descending
    return comments.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    if ((error as any)?.code === 'permission-denied') {
      handleFirestoreError(error, OperationType.LIST, COMMENTS_COLLECTION);
    }
    console.error('Error fetching support comments:', error);
    return [];
  }
}

// Post an anonymous community support comment
export async function createSupportComment(commentData: {
  text: string;
  name?: string;
  dealId?: string;
  dealTitle?: string;
  merchantName?: string;
}): Promise<string> {
  const text = commentData.text.trim();
  if (!text) {
    throw new Error('Comment text cannot be empty.');
  }
  if (text.length > 1500) {
    throw new Error('Comment exceeds maximum length of 1500 characters.');
  }

  const name = (commentData.name && commentData.name.trim()) || 'Anonymous Scout';
  const now = new Date().toISOString();

  try {
    const commentsRef = collection(db, COMMENTS_COLLECTION);
    const docRef = await addDoc(commentsRef, {
      text,
      name,
      dealId: commentData.dealId || null,
      dealTitle: commentData.dealTitle || null,
      merchantName: commentData.merchantName || null,
      createdAt: now,
      status: 'active',
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COMMENTS_COLLECTION);
  }
}

// Remove a comment (Admin only moderation)
export async function deleteSupportComment(commentId: string): Promise<void> {
  const path = `${COMMENTS_COLLECTION}/${commentId}`;
  try {
    const docRef = doc(db, COMMENTS_COLLECTION, commentId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
