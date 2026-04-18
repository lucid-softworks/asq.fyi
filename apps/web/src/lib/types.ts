export interface ProfileSummary {
  did: string;
  handle: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface QuestionCard {
  uri: string;
  cid: string;
  author: ProfileSummary;
  title: string;
  body: string;
  tags: string[];
  score: number;
  answerCount: number;
  commentCount: number;
  createdAt: string;
  acceptedAnswerUri: string | null;
  views7d: number;
  views24h: number;
  viewsTotal: number;
  viewerVote: "up" | "down" | null;
}

export interface CommentDetail {
  uri: string;
  cid: string;
  author: ProfileSummary;
  subjectUri: string;
  parentUri: string | null;
  body: string;
  createdAt: string;
}

export interface AnswerDetail {
  uri: string;
  cid: string;
  author: ProfileSummary;
  body: string;
  score: number;
  commentCount: number;
  createdAt: string;
  isAccepted: boolean;
  comments: CommentDetail[];
  viewerVote: "up" | "down" | null;
}

export interface QuestionDetail extends QuestionCard {
  answers: AnswerDetail[];
  comments: CommentDetail[];
}

export interface Paginated<T> {
  items: T[];
  cursor: string | null;
}

export interface ProfileView {
  profile: ProfileSummary & { updatedAt: string };
  recentQuestions: Array<{
    uri: string;
    cid: string;
    title: string;
    score: number;
    answerCount: number;
    createdAt: string;
  }>;
  recentAnswers: Array<{
    uri: string;
    cid: string;
    questionUri: string;
    body: string;
    score: number;
    createdAt: string;
  }>;
}

export interface TagCount {
  tag: string;
  questionCount: number;
  views7d: number;
}

export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}
