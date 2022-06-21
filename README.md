# POC For Using GigGitGadget with Another Git Repo

This project provides a GitHub action to run a docker container for testing
[GitGitGadget](https://github.com/gitgitgadget/git) in a workflow.

The docker container is a test SMTP server which can be started around
processing of /submit and /preview commands.

There is an action to start the container and an action to stop it.

## Before you start

The project is currently not generic for any user and will need to be made generic.

