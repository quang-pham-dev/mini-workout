# Security Policy

## Supported versions

This project is currently under active development. Security fixes are applied
to the current `main` branch. There are no long-term supported release
branches yet.

## Reporting a vulnerability

Please report security issues privately to
`quangpham.developer@gmail.com`. Do not open a public issue for an
unresolved vulnerability.

Include, when possible:

- A clear description of the vulnerability.
- Reproduction steps or a proof of concept.
- The affected app, package, or workflow.
- The potential impact and any suggested mitigation.

You will receive an acknowledgement as soon as practical. The project owner
will investigate, coordinate a fix, and determine whether public disclosure is
appropriate after a mitigation is available.

## Security expectations for contributors

- Never commit `.env` files, tokens, passwords, or private keys.
- Keep secrets server-side and avoid exposing them through client bundles.
- Validate untrusted input at application boundaries.
- Declare security-relevant dependency changes in the pull request.
- Report accidentally committed secrets immediately so they can be revoked.
