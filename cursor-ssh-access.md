# Cursor SSH Access

Date verified: 2026-05-15

## What is working

- Internet -> `ssh-claw.twohittz.com` -> `192.168.1.20` (`claw-edge-a`)
- Internet -> `ssh-edge-b.twohittz.com` -> `192.168.1.19` (`claw-edge-b`)
- From `192.168.1.20` you can reach:
  - `claw-rag` / `192.168.1.21`
  - `claw-llm` / `192.168.1.22`
- From `192.168.1.19` you can also reach:
  - `claw-rag` / `192.168.1.21`
  - `claw-llm` / `192.168.1.22`

Direct public tunnel entry for `.21` and `.22` was not left as the primary path. The verified path is to land on `.19` or `.20`, then hop inward.

## Local client key fingerprint

- `C:\Users\edsos\.ssh\id_ed25519_edgar_192_168_1_20`
- `SHA256:g7XqPFOtpLaap6AD+Ig43GYVbonz3fYUOwvjLZCAGYU`

## Server host key fingerprints

- `192.168.1.19` / `claw-edge-b`: `SHA256:3JaVfPY86HPdcI6VfDuVVnMI71i3/+taqt8064wxkT8`
- `192.168.1.20` / `claw-edge-a`: `SHA256:3m8JYnNcdfdUH2NxMiYN053JKH1n8Il0tWiM3+z06S4`
- `192.168.1.21` / `claw-rag`: `SHA256:cAmDpqv95t/ec20e9sBxysRM2tHwNQ1AzM6E6tKGCKY`
- `192.168.1.22` / `claw-llm`: `SHA256:LIgrNZE8qNCBx6rJ+HLDGhukLrztg6bxwpsaBJxh73M`

## SSH config for Cursor host machine

Put this in the SSH config on the machine running Cursor:

```sshconfig
Host claw-weekend-a
  HostName ssh-claw.twohittz.com
  User edgar
  IdentityFile C:/Users/edsos/.ssh/id_ed25519_edgar_192_168_1_20
  IdentitiesOnly yes
  ProxyCommand cloudflared access tcp --hostname %h

Host claw-weekend-b
  HostName ssh-edge-b.twohittz.com
  User edgar
  IdentityFile C:/Users/edsos/.ssh/id_ed25519_edgar_192_168_1_20
  IdentitiesOnly yes
  ProxyCommand cloudflared access tcp --hostname %h
```

Notes:

- The machine running Cursor must have `cloudflared` installed.
- The machine running Cursor must have the private key file above.
- These are the two public entry hosts that were verified live.

## How to reach the inside nodes after connecting

If you land on `claw-weekend-a` (`.20`):

```bash
ssh claw-rag
ssh claw-llm
```

If you land on `claw-weekend-b` (`.19`):

```bash
ssh claw-rag
ssh claw-llm
```

## Cursor prompt to paste

```text
Use SSH over Cloudflare Tunnel, not plain direct SSH to the public hostname.

You are connecting to a private SosaClaw network through a public Cloudflare entry host.

Verified public entry hosts:
- claw-weekend-a -> ssh-claw.twohittz.com -> 192.168.1.20
- claw-weekend-b -> ssh-edge-b.twohittz.com -> 192.168.1.19

SSH config expected on this machine:

Host claw-weekend-a
  HostName ssh-claw.twohittz.com
  User edgar
  IdentityFile C:/Users/edsos/.ssh/id_ed25519_edgar_192_168_1_20
  IdentitiesOnly yes
  ProxyCommand cloudflared access tcp --hostname %h

Host claw-weekend-b
  HostName ssh-edge-b.twohittz.com
  User edgar
  IdentityFile C:/Users/edsos/.ssh/id_ed25519_edgar_192_168_1_20
  IdentitiesOnly yes
  ProxyCommand cloudflared access tcp --hostname %h

Internal targets reachable after landing on either entry host:
- claw-rag = 192.168.1.21
- claw-llm = 192.168.1.22

Verified hop paths:
- 192.168.1.20 -> 192.168.1.21
- 192.168.1.20 -> 192.168.1.22
- 192.168.1.19 -> 192.168.1.21
- 192.168.1.19 -> 192.168.1.22

If the task is for the RAG node, connect to claw-weekend-a or claw-weekend-b first, then SSH to claw-rag.
If the task is for the LLM node, connect to claw-weekend-a or claw-weekend-b first, then SSH to claw-llm.

Do not assume plain `ssh ssh-claw.twohittz.com` works without the Cloudflare ProxyCommand.
```

