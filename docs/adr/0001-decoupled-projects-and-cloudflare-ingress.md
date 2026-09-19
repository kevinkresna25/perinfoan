# Decoupled Multi-Project Structure and Cloudflare Ingress Architecture

## Context & Decision
The Perinfoan platform hosts a variety of independent experimental and fun projects created by circle members with diverse tech stacks. We decided on:
1. A decoupled multi-project folder structure under `projects/<project-name>/`, where each project maintains its own dependencies, runtime, and Docker setup.
2. Building the Web Profile (`projects/profile/`) with Astro and Tailwind CSS as a static site served via Nginx Alpine container for minimal VPS memory footprint (~20MB RAM) and schema-validated content collections.
3. Routing each project via dedicated domains/hostnames connected directly through Cloudflare Zero Trust Tunnel ingress to isolated Docker container service names on a shared Docker bridge network (`perinfoan-net`), eliminating the need for a central Nginx reverse proxy on the VPS.
