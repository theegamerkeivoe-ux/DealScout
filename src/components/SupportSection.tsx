import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  ShieldAlert,
  Trash2,
  CheckCircle,
  AlertCircle,
  Shield,
  HelpCircle,
  Tag,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';
import { SupportComment, Deal } from '../types';
import {
  getSupportComments,
  createSupportComment,
  deleteSupportComment,
} from '../services/commentService';
import { useAuth } from '../context/AuthContext';

interface SupportSectionProps {
  deals?: Deal[];
  onSelectDeal?: (deal: Deal) => void;
}

export const SupportSection: React.FC<SupportSectionProps> = ({ deals = [], onSelectDeal }) => {
  const { isOwner } = useAuth();
  const [activeTab, setActiveTab] = useState<'comments' | 'policy'>('comments');
  const [comments, setComments] = useState<SupportComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [selectedDealId, setSelectedDealId] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<SupportComment | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load comments
  const loadComments = async () => {
    setLoading(true);
    try {
      const data = await getSupportComments();
      setComments(data);
    } catch (err: any) {
      console.error('Failed to load support comments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) {
      setErrorMessage('Please write a message before posting.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const matchedDeal = deals.find((d) => d.id === selectedDealId);

    try {
      const newId = await createSupportComment({
        text: commentText.trim(),
        name: authorName.trim() || 'Anonymous Scout',
        dealId: matchedDeal?.id,
        dealTitle: matchedDeal?.title,
        merchantName: matchedDeal?.merchantName,
      });

      const newComment: SupportComment = {
        id: newId,
        text: commentText.trim(),
        name: authorName.trim() || 'Anonymous Scout',
        dealId: matchedDeal?.id,
        dealTitle: matchedDeal?.title,
        merchantName: matchedDeal?.merchantName,
        createdAt: new Date().toISOString(),
        status: 'active',
      };

      setComments((prev) => [newComment, ...prev]);
      setCommentText('');
      setAuthorName('');
      setSelectedDealId('');
      setSuccessMessage('Your comment has been posted anonymously! Thank you for helping our community.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Error submitting comment:', err);
      setErrorMessage(err?.message || 'Failed to post comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!commentToDelete) return;
    setDeletingId(commentToDelete.id);
    try {
      await deleteSupportComment(commentToDelete.id);
      setComments((prev) => prev.filter((c) => c.id !== commentToDelete.id));
      setSuccessMessage('Comment removed in accordance with moderation policy.');
      setCommentToDelete(null);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Delete comment error:', err);
      setErrorMessage(err?.message || 'Failed to remove comment.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 45) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Tab Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Open Community Support
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Ask questions, report expired discount codes, or share deal feedback anonymously on the app.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl shrink-0 self-start sm:self-auto border border-gray-200/80 dark:border-gray-700/80">
          <button
            type="button"
            onClick={() => setActiveTab('comments')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'comments'
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-2xs'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Comments ({comments.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('policy')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'policy'
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-2xs'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-500" />
            <span>Moderation Policy</span>
          </button>
        </div>
      </div>

      {/* Admin Notice Bar (visible only to logged-in administrator) */}
      {isOwner && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2 font-medium">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Administrator Moderation Active:</strong> You can remove any comment deemed harmful, abusive, or spam.
            </span>
          </div>
          <span className="bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-100 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider shrink-0">
            Admin
          </span>
        </div>
      )}

      {/* Notification Alerts */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl flex items-center justify-between gap-2 text-xs text-red-800 dark:text-red-300 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-700 dark:text-red-400 font-bold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: COMMENTS LIST & FORM */}
      {activeTab === 'comments' && (
        <div className="space-y-6">
          {/* Post Anonymous Comment Form */}
          <div className="bg-gray-50 dark:bg-gray-900/80 rounded-2xl p-4 sm:p-6 border border-gray-200/90 dark:border-gray-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Leave an Anonymous Comment or Question</span>
              </h3>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                No sign-up or email required
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Optional Name & Deal Selector row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Display Moniker (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="e.g. Anonymous Scout"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:text-gray-900 dark:focus:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Referencing a Deal? (Optional)
                  </label>
                  <select
                    value={selectedDealId}
                    onChange={(e) => setSelectedDealId(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-800 focus:text-gray-900 dark:focus:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="">General Support / No Specific Deal</option>
                    {deals.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.merchantName}: {d.discount || d.title.slice(0, 30)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Message Area */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Your Comment or Inquiry *
                </label>
                <textarea
                  rows={3}
                  required
                  maxLength={1500}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Need help with a promo code? Found an expired discount? Want us to source a deal for a store? Let us know here..."
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:text-gray-900 dark:focus:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y leading-relaxed"
                />
                <div className="flex items-center justify-between mt-1.5 text-[10px] text-gray-400 dark:text-gray-500">
                  <span className="flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Subject to our{' '}
                    <button
                      type="button"
                      onClick={() => setActiveTab('policy')}
                      className="underline hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                    >
                      Comment Moderation Policy
                    </button>
                    . Harmful comments are removed.
                  </span>
                  <span>{commentText.length} / 1500</span>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={submitting || !commentText.trim()}
                  className="bg-amber-400 hover:bg-amber-500 active:bg-amber-600 disabled:opacity-50 text-gray-950 font-bold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Posting...' : 'Post Anonymously'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Comments List Header */}
          <div className="flex items-center justify-between pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span>Community Discussion &amp; Inquiries ({comments.length})</span>
            </h4>
            <button
              type="button"
              onClick={loadComments}
              className="text-[11px] font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white underline cursor-pointer"
            >
              Refresh
            </button>
          </div>

          {/* Loading indicator */}
          {loading && (
            <div className="text-center py-8 space-y-2">
              <div className="w-6 h-6 border-2 border-[#FACC15] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Loading community comments...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && comments.length === 0 && (
            <div className="text-center py-10 px-4 bg-gray-50/50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 space-y-2">
              <MessageSquare className="w-8 h-8 text-gray-400 dark:text-gray-600 mx-auto" />
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                No comments yet
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                Be the first to ask a question, request a merchant promo, or share code feedback!
              </p>
            </div>
          )}

          {/* Comments Feed */}
          {!loading && comments.length > 0 && (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200/90 dark:border-gray-800 shadow-2xs hover:border-gray-300 dark:hover:border-gray-700 transition-colors space-y-2"
                >
                  {/* Comment Top Meta */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-[#FACC15] font-black text-xs flex items-center justify-center shrink-0 border border-amber-200/80 dark:border-amber-900/50">
                        {comment.name ? comment.name.charAt(0).toUpperCase() : 'A'}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-gray-900 dark:text-white block truncate">
                          {comment.name || 'Anonymous Scout'}
                        </span>
                      </div>
                      <span className="text-gray-300 dark:text-gray-700">•</span>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(comment.createdAt)}
                      </span>
                    </div>

                    {/* Admin Delete Action Button */}
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => setCommentToDelete(comment)}
                        className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Remove harmful comment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Remove</span>
                      </button>
                    )}
                  </div>

                  {/* Optional Deal Tag */}
                  {(comment.merchantName || comment.dealTitle) && (
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-semibold text-gray-700 dark:text-gray-300 border border-gray-200/80 dark:border-gray-700">
                      <Tag className="w-2.5 h-2.5 text-[#FACC15]" />
                      <span className="truncate max-w-[240px]">
                        {comment.merchantName ? `${comment.merchantName}: ` : ''}
                        {comment.dealTitle || 'Specific Deal'}
                      </span>
                    </div>
                  )}

                  {/* Comment Body */}
                  <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words whitespace-pre-line">
                    {comment.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COMMENT MODERATION POLICY */}
      {activeTab === 'policy' && (
        <div className="space-y-5 text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50/60 dark:bg-gray-800/40 p-5 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-900 dark:text-white font-bold text-sm sm:text-base border-b border-gray-200 dark:border-gray-700 pb-3">
            <Shield className="w-5 h-5 text-amber-500 shrink-0" />
            <span>Deal Scout Comment Moderation Policy</span>
          </div>

          <p>
            Deal Scout provides open, anonymous community commenting to make reporting coupon issues,
            asking discount questions, and sharing savings quick and accessible for every visitor without
            requiring account registration or email sharing.
          </p>

          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
              1. Community Guidelines &amp; Accepted Comments
            </h4>
            <p className="text-xs">
              We welcome and encourage:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <li>Reporting invalid, expired, or non-working coupon codes so we can update them.</li>
              <li>Inquiring about available promotions for specific stores, software, or brands.</li>
              <li>Sharing tips on checkout verification, savings hurdles, or additional discounts.</li>
              <li>General polite feedback to help improve the Deal Scout platform.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
              2. Prohibited Content (Zero Tolerance)
            </h4>
            <p className="text-xs">
              The following behaviors and content types are strictly prohibited and will result in
              immediate removal:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <li><strong>Harassment &amp; Hate Speech:</strong> Profanity, abusive remarks, personal attacks, slurs, or harassment targeting any individual or group.</li>
              <li><strong>Spam &amp; Unauthorized Links:</strong> Dropping affiliate links, referral spam, link shorteners, MLM schemes, or repetitive unsolicited self-promotion.</li>
              <li><strong>Scams &amp; Malicious Content:</strong> Phishing URLs, fake voucher offers designed to deceive, or harmful download links.</li>
              <li><strong>Doxxing &amp; Personal Data:</strong> Posting phone numbers, personal emails, physical addresses, or private individual details.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
              3. Administrator Moderation &amp; Removal Rights
            </h4>
            <p className="text-xs">
              Deal Scout administrators actively monitor community feedback. Administrators reserve
              the unconditional right to remove, edit, or hide any comment that violates this policy,
              contains inaccurate or harmful information, or degrades community safety.
            </p>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <strong className="block font-bold">Reporting Harmful Content:</strong>
            <p>
              If you see a comment violating this policy, administrators review new posts regularly
              and will remove harmful submissions.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('comments')}
              className="bg-[#FACC15] hover:bg-yellow-400 text-gray-950 font-bold px-4 py-2 rounded-lg text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Back to Community Comments →
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Admin Comment Removal */}
      {commentToDelete && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/60 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-base text-gray-900 dark:text-white">
                  Remove Comment?
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Moderator Action
                </p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/70 p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300 italic max-h-28 overflow-y-auto">
              &quot;{commentToDelete.text}&quot;
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400">
              Are you sure you want to permanently remove this comment as harmful or in violation of the
              Comment Moderation Policy? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCommentToDelete(null)}
                disabled={deletingId !== null}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingId !== null}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                {deletingId ? (
                  <span>Removing...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Removal</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
