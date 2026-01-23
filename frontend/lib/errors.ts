type ErrorPattern = { match: string[]; message: string };

const errorPatterns: ErrorPattern[] = [
  {
    match: ["duplicate key", "users_email_key"],
    message: "An employee with this email address already exists.",
  },
  {
    match: ["duplicate key", "auth0_id"],
    message: "This user already exists in the system.",
  },
  {
    match: ["duplicate key", "squads_name"],
    message: "A squad with this name already exists.",
  },
  { match: ["duplicate key"], message: "This item already exists." },
  {
    match: ["failed to create user in auth0"],
    message:
      "Unable to create user account. The email may already be registered.",
  },
  {
    match: ["forbidden"],
    message: "You don't have permission to perform this action.",
  },
  {
    match: ["unauthorized"],
    message: "You don't have permission to perform this action.",
  },
  { match: ["invalid email"], message: "Please enter a valid email address." },
  { match: ["email format"], message: "Please enter a valid email address." },
  { match: ["required"], message: "Please fill in all required fields." },
  {
    match: ["network"],
    message: "Network error. Please check your connection and try again.",
  },
  {
    match: ["fetch failed"],
    message: "Network error. Please check your connection and try again.",
  },
  { match: ["timeout"], message: "The request timed out. Please try again." },
  {
    match: ["internal system error"],
    message:
      "An unexpected error occurred. Please try again or contact support.",
  },
  {
    match: ["internal server error"],
    message:
      "An unexpected error occurred. Please try again or contact support.",
  },
];

const matchError = (
  msg: string,
  patterns: ErrorPattern[],
  fallback: string,
): string => {
  const lower = msg.toLowerCase();
  return (
    patterns.find((p) => p.match.every((kw) => lower.includes(kw)))?.message ??
    fallback
  );
};

const toMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

export const parseErrorMessage = (error: unknown): string =>
  matchError(
    toMessage(error),
    errorPatterns,
    "An error occurred. Please try again.",
  );

export const parseSquadErrorMessage = (error: unknown): string =>
  matchError(
    toMessage(error),
    [
      {
        match: ["duplicate key"],
        message: "A squad with this name already exists.",
      },
      {
        match: ["already exists"],
        message: "A squad with this name already exists.",
      },
      {
        match: ["forbidden"],
        message: "You don't have permission to create squads.",
      },
      {
        match: ["unauthorized"],
        message: "You don't have permission to create squads.",
      },
    ],
    "Failed to create squad. Please try again.",
  );

export const parseInvitationErrorMessage = (error: unknown): string =>
  matchError(
    toMessage(error),
    [
      {
        match: ["pending invitation", "already exists"],
        message: "An invitation has already been sent to this email address.",
      },
      {
        match: ["invitation", "already exists"],
        message: "An invitation has already been sent to this email address.",
      },
      {
        match: ["duplicate key", "invitations_email"],
        message: "An invitation has already been sent to this email address.",
      },
      {
        match: ["user", "already exists"],
        message: "A user with this email address already exists in the system.",
      },
      {
        match: ["duplicate key", "users_email"],
        message: "A user with this email address already exists in the system.",
      },
      {
        match: ["email", "already registered"],
        message: "This email is already registered in the system.",
      },
      {
        match: ["invalid email"],
        message: "Please enter a valid email address.",
      },
      {
        match: ["email", "invalid"],
        message: "Please enter a valid email address.",
      },
      { match: ["email", "required"], message: "Email address is required." },
      {
        match: ["role", "required"],
        message: "Please select a role for the invitation.",
      },
      {
        match: ["role", "invalid"],
        message: "Please select a valid role (supervisor or admin).",
      },
      {
        match: ["forbidden"],
        message: "You don't have permission to send invitations.",
      },
      {
        match: ["unauthorized"],
        message: "You don't have permission to send invitations.",
      },
      { match: ["expired"], message: "This invitation has expired." },
      { match: ["revoked"], message: "This invitation has been revoked." },
    ],
    "Failed to send invitation. Please try again.",
  );
