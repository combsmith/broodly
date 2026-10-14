# GitHub Repository Settings — Terraform
#
# Manages GitHub repository rulesets for combsmith/broodly.
# Apply with a GitHub token that has `administration:write` scope on this repo:
#
#   export TF_VAR_github_token=<your-token>
#   terraform init
#   terraform apply
#
# Standard: https://github.com/combsmith/.github/blob/main/standards/github-settings.md

terraform {
  required_version = ">= 1.5"

  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}

provider "github" {
  token = var.github_token
  owner = var.github_owner
}

# -----------------------------------------------------------------------------
# code-quality ruleset
#
# Enforces required CI status checks on the default branch before merging.
# Standard: github-settings.md#code-quality--required-checks-ruleset-all-repositories
# -----------------------------------------------------------------------------

resource "github_repository_ruleset" "code_quality" {
  name        = "code-quality"
  repository  = var.repository_name
  target      = "branch"
  enforcement = "active"

  conditions {
    ref_name {
      include = ["~DEFAULT_BRANCH"]
      exclude = []
    }
  }

  rules {
    required_status_checks {
      strict_required_status_checks_policy = false

      required_check {
        context        = "CI / TypeScript"
        integration_id = 15368 # GitHub Actions app ID
      }

      required_check {
        context        = "CI / Go"
        integration_id = 15368
      }

      required_check {
        context        = "CodeQL / Analyze"
        integration_id = 15368
      }

      required_check {
        context        = "SonarCloud Analysis / SonarCloud"
        integration_id = 15368
      }

      required_check {
        context        = "dependency-audit / Detect ecosystems"
        integration_id = 15368
      }
    }
  }
}
