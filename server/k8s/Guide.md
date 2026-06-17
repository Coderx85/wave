# k9s + Minikube Guide

## Prerequisites

```bash
# Start minikube
minikube start

# Build and load the server image
docker build -t server:latest -f Dockerfile ..
minikube image load server:latest

# Install k9s (if not installed)
# brew install k9s          # macOS
# snap install k9s           # Linux
# choco install k9s          # Windows
```

---

## Deploy with k9s

### Step 1 — Launch k9s and apply manifests

```bash
# Start k9s
k9s
```

Inside k9s:

1. Press `:` to open the command bar
2. Type `namespace server` and press Enter (creates namespace if it doesn't exist — or do it from CLI first)
3. Press `:` → `apply k8s/kustomization.yaml` — this won't work in k9s directly

**Better: apply from CLI first, then monitor with k9s:**

```bash
kubectl apply -k k8s/
k9s -n server
```

### Step 2 — k9s navigation

| Key | Action |
|-----|--------|
| `0` | Show all pods |
| `:ns server` | Switch to `server` namespace |
| `:deploy` | View deployments |
| `:svc` | View services |
| `:sts` | View statefulsets |
| `:pv` | View persistent volumes |
| `ctrl+d` | Describe selected resource |
| `l` | Show pod logs |
| `s` | Shell into a container |
| `e` | Edit resource |
| `y` | View YAML |
| `ctrl+k` | Kill (delete) resource |
| `?` | Help / keybindings |

### Step 3 — Watch pods come up

```bash
k9s -n server
```

Press `0` to see all pods. Wait until all pods show `Running`:

```
NAME                                   READY   STATUS    RESTARTS
pod/auth-service-xxx                   1/1     Running   0
pod/backend-server-xxx                 1/1     Running   0
pod/dragonfly-xxx                      1/1     Running   0
pod/mailhog-xxx                        1/1     Running   0
pod/nginx-xxx                          1/1     Running   0
pod/notification-service-xxx           1/1     Running   0
pod/postgres-0                         1/1     Running   0
pod/redpanda-0                         1/1     Running   0
pod/tigerbeetle-0                      1/1     Running   0
pod/user-service-xxx                   1/1     Running   0
pod/wallet-service-xxx                 1/1     Running   0
```

### Step 4 — Check logs

In k9s, navigate to a pod with arrow keys and press `l` to tail logs. Press `esc` to exit logs view.

### Step 5 — Access services

From CLI (outside k9s):

```bash
minikube service nginx -n server --url
minikube service auth-service -n server --url
minikube service wallet-service -n server --url
minikube service user-service -n server --url
```

### Step 6 — Delete everything

In k9s: `:ns server` → `ctrl+d` on the namespace → confirm.

Or from CLI:

```bash
kubectl delete ns server
```

---

## Service explanations

### ConfigMaps (`configmap.yaml`)

**`server-config`** — shared environment injected into every Node.js container:

| Variable | Value | Purpose |
|----------|-------|---------|
| `NODE_ENV` | `development` | Runtime environment |
| `PORT` | `3000` | App listens on this port |
| `DATABASE_URL` | `postgresql://postgres:postgres@postgres:5432/wave_db` | Postgres DSN — hostname `postgres` matches the k8s service name |
| `KAFKA_BROKER_URL` | `redpanda:29092` | Kafka broker — internal Redpanda port |
| `EMAIL_HOST` | `mailhog` | SMTP server hostname |
| `EMAIL_PORT` | `1025` | SMTP port |

**`nginx-config`** — mounts as `/etc/nginx/conf.d/default.conf` in the nginx pod. Defines three upstreams:

| Upstream | Backend service | Route |
|----------|----------------|-------|
| `auth_upstream` | `auth-service:3000` | `/api/auth/` |
| `wallet_upstream` | `wallet-service:3000` | `/api/wallet/` |
| `user_upstream` | `user-service:3000` | `/api/user/` |

Nginx is the single entry point — it proxies to the correct microservice based on URL prefix.

---

### Namespace (`namespace.yaml`)

All resources are scoped to the `server` namespace. Keeps them isolated from other workloads on the cluster.

---

### PVCs (`pvc.yaml`)

Two PVCs, both requesting 1 GiB of `ReadWriteOnce` storage. Minikube provisions these automatically from its built-in `hostpath` provisioner.

| PVC | Mounted by | Data |
|-----|-----------|------|
| `postgres-data` | postgres StatefulSet | PostgreSQL data files at `/var/lib/postgresql` |
| `tigerbeetle-data` | tigerbeetle StatefulSet | TigerBeetle ledger data at `/data` |

---

### StatefulSets (`statefulset.yaml`)

StatefulSets are used for services that need stable network identity and persistent storage.

#### postgres

| Field | Value |
|-------|-------|
| Image | `postgres:18-alpine` |
| Port | 5432 |
| Env | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` |
| Storage | 1 GiB via `volumeClaimTemplates` |
| Startup probe | `pg_isready -U postgres` — waits for Postgres to accept connections |
| Liveness probe | Same — restarts pod if Postgres dies |

Primary relational database. Every Node.js service connects here via `DATABASE_URL`.

#### redpanda

| Field | Value |
|-------|-------|
| Image | `redpandadata/redpanda:latest` |
| Ports | 9092 (external Kafka), 29092 (internal Kafka) |
| Args | `--kafka-addr PLAINTEXT://0.0.0.0:29092,OUTSIDE://0.0.0.0:9092` |
| Env | `REDPANDA_AUTO_CREATE_TOPICS_ENABLED=true` |
| Startup probe | `rpk cluster info` |

Kafka-compatible message broker. Wallet and notification services produce/consume transaction events. Internal clients (same cluster) connect via `redpanda:29092`.

#### tigerbeetle

| Field | Value |
|-------|-------|
| Image | `ghcr.io/tigerbeetle/tigerbeetle:latest` |
| Port | 4343 |
| Args | `start --addresses=0.0.0.0:4343 /data/tigerbeetle` |
| Storage | 1 GiB via `volumeClaimTemplates` |
| Startup probe | `kill -0 $(pidof tigerbeetle)` |

Financial accounting ledger. Used by wallet-service for double-entry bookkeeping. Data is persisted on the PVC.

---

### Deployments (`deployment.yaml`)

All stateless services. They can be scaled with `kubectl scale deployment/<name> --replicas=N -n server`.

#### backend-server

| Field | Value |
|-------|-------|
| Image | `server:latest` |
| Command | (default — `node --import tsx src/index.ts`) |
| Port | 3000 |
| Service type | ClusterIP (internal only) |
| Role | Default backend profile — runs the main server. Not exposed via nginx. |

#### auth-service

| Field | Value |
|-------|-------|
| Image | `server:latest` |
| Port | 3000 |
| Service type | NodePort (30083) |
| Role | Handles authentication routes (`/api/auth/`). Nginx proxies to it. |

#### user-service

| Field | Value |
|-------|-------|
| Image | `server:latest` |
| Port | 3000 |
| Service type | NodePort (30082) |
| Role | Handles user management routes (`/api/user/`). Nginx proxies to it. |

#### wallet-service

| Field | Value |
|-------|-------|
| Image | `server:latest` |
| Port | 3000 |
| Service type | NodePort (30081) |
| Role | Handles wallet/transaction routes (`/api/wallet/`). Nginx proxies to it. Depends on redpanda, tigerbeetle, dragonfly, and mailhog. |

#### notification-service

| Field | Value |
|-------|-------|
| Image | `server:latest` |
| Command | `node --import tsx src/notification-service.ts` |
| Port | 3000 |
| Service type | ClusterIP (internal only) |
| Role | Listens for Kafka transaction events and sends email notifications. Not exposed externally. |

#### dragonfly

| Field | Value |
|-------|-------|
| Image | `dragonflydb/dragonfly:latest` |
| Port | 6379 |
| Probes | `redis-cli -h localhost -p 6379 ping` |
| Service type | ClusterIP |
| Role | Redis-compatible cache. Used by wallet-service for caching. No persistence configured (ephemeral). |

#### mailhog

| Field | Value |
|-------|-------|
| Image | `mailhog/mailhog:latest` |
| Ports | 1025 (SMTP), 8025 (Web UI) |
| Probe | HTTP GET on `/` port 8025 |
| Service type | ClusterIP |
| Role | Fake SMTP server for development. Captures all outgoing emails and displays them in a web UI at port 8025. |

#### nginx

| Field | Value |
|-------|-------|
| Image | `nginx:1.27-alpine` |
| Port | 80 |
| Service type | NodePort (30080) |
| Config | Mounted from `nginx-config` ConfigMap |
| Role | Reverse proxy — single entry point. Routes `/api/auth/` → auth-service, `/api/wallet/` → wallet-service, `/api/user/` → user-service. |

---

### Services (`service.yaml`)

| Service | Type | Port(s) | NodePort | Target |
|---------|------|---------|----------|--------|
| `postgres` | ClusterIP | 5432 | — | Internal database access |
| `redpanda` | ClusterIP | 9092, 29092 | — | Internal Kafka |
| `tigerbeetle` | ClusterIP | 4343 | — | Internal ledger |
| `dragonfly` | ClusterIP | 6379 | — | Internal cache |
| `mailhog` | ClusterIP | 1025, 8025 | — | Internal SMTP + web UI |
| `backend-server` | ClusterIP | 3000 | — | Internal only |
| `auth-service` | NodePort | 3000 | 30083 | Dev access |
| `user-service` | NodePort | 3000 | 30082 | Dev access |
| `wallet-service` | NodePort | 3000 | 30081 | Dev access |
| `notification-service` | ClusterIP | 3000 | — | Internal only |
| `nginx` | NodePort | 80 | 30080 | Main entry point |

**ClusterIP** = reachable only from inside the cluster (service DNS name).

**NodePort** = reachable from outside via `minikube ip:<nodePort>`.

---

### Kustomization (`kustomization.yaml`)

Lists all resource files so you can apply everything with one command:

```bash
kubectl apply -k k8s/
```

Order of application: namespace → config → storage → stateful services → stateless services → networking.

---

## Startup order (dependency chain)

```
postgres, redpanda, dragonfly, mailhog, tigerbeetle
  └── wallet-service, notification-service
        └── auth-service, user-service, backend-server
              └── nginx
```

Kuberentes doesn't enforce this ordering — it's the application-level readiness that matters. Services with startup probes will crash-loop until their dependencies are ready.

## Quick reference

```bash
# Apply everything
kubectl apply -k k8s/

# Watch pods come up
k9s -n server

# Access the app
minikube service nginx -n server --url

# Scale a service
kubectl scale deployment/auth-service --replicas=3 -n server

# Tail logs (CLI)
kubectl logs -n server deployment/nginx -f

# Shell into a pod
kubectl exec -it -n server deployment/nginx -- sh

# Delete everything
kubectl delete ns server
```
