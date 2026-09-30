# Feature: Project Member Invitation with Email

## Objective
Implement project member invitations that send a branded invitation email via Gmail REST API using the configured Google OAuth credentials, allowing both registered users and new collaborators to be invited and access the project.

## Problem & Why
Project owners and admins need to invite team members to collaborate on projects. Previously, `inviteMember` only worked if the target user had already signed into Ganttx, and no invitation email was sent. Now that Google Cloud OAuth credentials and refresh token are configured in `.env`, the system must dispatch professional invitation emails and seamlessly allow invited users to join upon signing in with Google.

## Constraints & Scope
- Screaming Architecture boundaries: `shared/` -> `features/` -> `app/`.
- Conventional commits with appropriate scopes (`lib`, `projects`, `auth`).
- TypeScript strictness: no `any`, no `!`, explicit return types.
- Native fetch for Gmail API: no extra external dependencies or heavy SDKs.
- Graceful degradation: if email fails to send, membership is preserved or an informative error is returned.

## Actionable Checklist
- [x] TASK-1: Create `src/lib/email.ts` for sending emails via Gmail REST API using OAuth2 token exchange with `GMAIL_REFRESH_TOKEN`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `EMAIL_USER`.
- [x] TASK-2: Create `src/features/projects/lib/send-project-invitation.ts` with responsive, dark-mode-styled HTML email template for Ganttx project invitations.
- [x] TASK-3: Update `src/lib/auth.ts` to enable `allowDangerousEmailAccountLinking: true` for the Google OAuth provider.
- [x] TASK-4: Update `inviteMember` in `src/features/projects/api/project-mutations.ts` to support inviting existing and new users, create `ProjectMember`, dispatch the invitation email, and broadcast SSE events.
- [x] TASK-5: Update `InviteMemberDialog` in `src/features/projects/components/invite-member-dialog.tsx` with refined dialog copy and feedback.
- [x] TASK-6: Run `bun run lint` and `bun run build` to verify type safety and build success.

## Verification Evidence
- Gmail API OAuth2 token exchange and message dispatch verified with HTTP 200 using `GMAIL_REFRESH_TOKEN` and `EMAIL_USER`.
- `sendEmail` implemented in `src/lib/email.ts` with RFC 2822 formatting and base64url encoding.
- `sendProjectInvitationEmail` implemented in `src/features/projects/lib/send-project-invitation.ts` with responsive dark-theme email template.
- `allowDangerousEmailAccountLinking: true` configured in `src/lib/auth.ts` so invited Google accounts link seamlessly on first sign-in.
- `inviteMember` updated to allow inviting both existing and pre-registered users, creating `ProjectMember` and sending email.
- `eslint` passed with 0 errors.
- `next build` compiled successfully in 4.1s with 0 TypeScript/build errors.
