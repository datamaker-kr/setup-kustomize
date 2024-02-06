# setup-kustomize

## Description

Install and setup kustomize in your GitHub Actions workflow.

## Options

| Input     | Description                                   |
|-----------|-----------------------------------------------|
| `version` | Kustomize Version to install. Defaults to `d` |

## Example Usage

```yaml
on:
  push:
    branches:
      - master

jobs:
  create-deployment-branch:
    runs-on: ubuntu-latest
    needs:
      - publish-image
    steps:
      - uses: imranismail/setup-kustomize@v2
      - run: |
          kustomize edit set image app:${GITHUB_SHA}
          git add .
          git commit -m "Set `app` image tag to `${GITHUB_SHA}`"
          git push
```
