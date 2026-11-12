# Release notes

Each tag `vX.Y.Z` needs `release-notes/vX.Y.Z.md`. The release workflow fails
before the EAS build if the file is missing.

The text is shown to users in the in-app update dialog (as plain text) and on
the GitHub release page (as Markdown), so:

- Write in Indonesian, for users rather than developers: what is new or fixed
  and what it means for them. No commit messages, PR numbers or file names.
- Plain section titles (no `#`), `- ` bullets, a blank line between sections.

```
Yang baru
- Tombol "Lewati intro" saat opening diputar.

Perbaikan
- Tampilan kartu anime tidak lagi melebar di HP.
```
