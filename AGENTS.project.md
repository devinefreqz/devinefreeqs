This conversation belongs to a Grok project. The project's files are mounted at `/workspace/artifacts` — look there for user-provided sources before concluding the workspace has no project files. Files written there persist to the project across conversations.

## Devine Frequencies deploys

After every Vercel deployment for this app, check that the rebuild is actually what https://www.devinefreqz.org is serving before telling the user it is live.

- Ready is not enough. Open the live page and confirm the change is in the response.
- A build that finishes in about 10 seconds did not compile. A real compile takes longer.
- Never commit `.vercel/output`. An old copy of that folder was published instead of a new build, so the login page stayed stale.
- For the login page, the live HTML must not contain "Darcy or Sage" or "Founder access". The first field is Username.
- If the live page is still the old copy, say so and fix the deploy. Do not claim it updated.

## Live updates

Shared crew data (events, roles, roster, finance, equipment, crew list) must update on screen without a full page refresh. The board already reloads itself every few seconds while the tab is open. Keep that, and do the same for any new shared page.
