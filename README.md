# GitClaim

GitClaim is a tool designed to help developers find and claim open-source issues automatically. It monitors a watchlist of repositories, analyzes new issues using an LLM to see if they match your technical stack, and automatically posts a tailored proposal comment to claim the task before it gets taken.

---

## The Problem
Finding meaningful open-source issues to work on is time-consuming. 
* High-quality "good first issues" in popular repositories are usually claimed within minutes of being opened.
* Developers waste hours scrolling through backlogs and reading vague descriptions, only to find the issue does not match their skillset.
* Project maintainers lose momentum when critical bugs or UI fixes sit unassigned because the right contributors haven't seen them.

---

## The Solution
GitClaim acts as a background worker that automates the discovery and assignment process.

1. **Repository Tracking:** The system listens to a specific watchlist of open-source projects for any new issue events.
2. **AI Evaluation:** Issues are ingested, parsed by category (like UI/UX, Documentation, or Server), and evaluated for compatibility against your skills to return a true/false match score.
3. **Automated Claiming:** For high-confidence matches, the system generates a professional, context-aware contribution proposal and uses the GitHub API to post it directly as an issue comment.
4. **Management Dashboard:** A clean Next.js web interface displays live sync logs and categorizes issues by status (Pending Review, Ignored Domain, or Automatically Claimed).

---

## Tech Stack
* **Framework:** Next.js (App Router), TypeScript
* **Styling:** Tailwind CSS (with native dark mode configuration)
* **Database:** AWS DynamoDB
* **API Clients:** Octokit / GitHub REST API

---

## Setup and Installation

### 1. Clone the Repository and Install Dependencies
```bash
git clone [https://github.com/Kushal-911/gitclaim.git](https://github.com/Kushal-911/gitclaim.git)
cd gitclaim
npm install
