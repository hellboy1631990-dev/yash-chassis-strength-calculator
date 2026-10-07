# Security Policy

## Supported versions

Only the current `main` branch (the live Netlify deployment) is supported. Older commits and branches do not receive fixes.

## Reporting a vulnerability

Please do not open a public issue for security problems.

Report privately through GitHub: go to the **Security** tab of this repository and click **Report a vulnerability** (private vulnerability reporting is enabled).

Include:

- what you found and where (file, page or URL)
- steps to reproduce
- the impact you expect

You should get an acknowledgement within 7 days. Confirmed issues will be fixed on `main` and credited in the advisory unless you ask otherwise.

## Scope

This is a static, client-side calculator. It has no server, login or database, and job data entered by users stays in their own browser (localStorage). In scope:

- cross-site scripting or script injection in the app, report or dashboard pages
- cross-origin messaging (postMessage) issues
- weaknesses in the Netlify security headers (`netlify.toml`)
- anything that changes a calculated result without the user's input

Out of scope: the accuracy of engineering inputs entered by users, and issues in third-party services (GitHub, Netlify, Google Fonts) that should be reported to those providers.

## Engineering disclaimer

Results from this tool must be checked by a competent engineer before they are relied on for compliance or certification.
