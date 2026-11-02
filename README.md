# sgrelease — build box for the SalesGraph desktop client

This repository is **public on purpose**: standard GitHub-hosted runners are free
for public repositories, and a macOS runner bills at 10x on a private one
(~400 minutes per release for the two images). The source stays private.

It contains no source. It checks the private repository out at a version tag,
builds the three installers, and uploads them to the release bucket.

## What it produces

| platform | files | uploaded to |
|---|---|---|
| Windows | `SalesGraph_<v>_x64.exe` + `.blockmap` + `latest.yml` | `win/<v>/` |
| macOS arm64 | `SalesGraph_<v>_arm64.dmg` + `.blockmap` | `mac/<v>/` |
| macOS x64 | `SalesGraph_<v>_x64.dmg` + `.blockmap` | `mac/<v>/` |

Each platform also writes `manifest.json` (version, commit, node version, size
and sha512 of every file) — that is the authoritative record of a version.

**A green run is not a release.** Nothing points at the new files until the
operator promotes them from the private repository:

```
node scripts/publish-release.mjs --version <v> --promote
```

## Setup (once)

Settings -> Secrets and variables -> Actions:

**Secrets**

| name | what it must be |
|---|---|
| `SG_REPO_TOKEN` | fine-grained PAT for `shellxuatgit/salesgraph`, permission **Contents: Read-only**, expiry <= 90 days. Not a classic PAT: that would grant every private repository. |
| `CLOUDFLARE_API_TOKEN` | Account -> **Workers R2 Storage: Edit**. It can write objects; it cannot flip the download pointer (that is a local step). |

**Variables**

| name | value |
|---|---|
| `SG_REPO` | `shellxuatgit/salesgraph` |

## Running it

Actions -> *Build the three installers and upload them to R2* -> Run workflow ->
`version` = the version being released. The private repository must already have
the tag `v<version>` on the commit that carries that version number; the job
refuses to build otherwise (`package.json` must say the same version).

## Rules this repository follows (a public repository has consequences)

1. **`workflow_dispatch` only.** A fork pull request must never run a workflow
   that holds a token for the private repository.
2. **No tests here.** A failing test prints source excerpts into a log everyone
   can read. The test gate runs locally before a version is cut.
3. **No pointer writes here.** Publishing is a human decision, taken locally
   after the bytes are verified in the bucket.
