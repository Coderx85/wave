# kube-dev — Manual step-by-step guide

## Prerequisites

- **minikube** at custom home: `MINIKUBE_HOME=/home/coderx85/minikube-ext`
- **kubectl** configured for the `ext` cluster
- **k9s** installed

---

## Step 1 — Start the cluster

```bash
# Start with 6GB RAM (tigerbeetle needs ~1.5GB)
MINIKUBE_HOME=/home/coderx85/minikube-ext minikube start -p ext --memory=6144 --cpus=2

# If cluster already exists, delete and recreate:
#   MINIKUBE_HOME=/home/coderx85/minikube-ext minikube delete -p ext
```

## Step 2 — Build and load the server image

Build directly inside minikube's Docker daemon (avoids `minikube image load`):

```bash
eval $(MINIKUBE_HOME=/home/coderx85/minikube-ext minikube -p ext docker-env)
docker build -t server:latest .
```

## Step 3 — Deploy

```bash
MINIKUBE_HOME=/home/coderx85/minikube-ext kubectl apply -k k8s/kube-dev/
```

You should see:
```
namespace/server created
configmap/server-config created
service/backend-server created
service/postgres created
service/tigerbeetle created
deployment.apps/backend-server created
statefulset.apps/postgres created
statefulset.apps/tigerbeetle created
```

## Step 4 — Watch pods

```bash
MINIKUBE_HOME=/home/coderx85/minikube-ext kubectl get pods -n server -w
```

Wait until all 3 show `1/1 Running`:

```
NAME                              READY   STATUS    RESTARTS
backend-server-xxx                1/1     Running   0
postgres-0                        1/1     Running   0
tigerbeetle-0                     1/1     Running   0
```

> **If tigerbeetle crashes** — it needs more memory. Delete the cluster and recreate with `--memory=6144`.
>
> **If backend-server shows ImagePullBackOff** — the image didn't load. Rebuild with `eval $(minikube docker-env) && docker build -t server:latest .` then restart the pod.

## Step 5 — Access the API

```bash
MINIKUBE_HOME=/home/coderx85/minikube-ext minikube service backend-server -n server -p ext --url
```

This prints a URL like `http://192.168.49.2:30090`. Curl it:

```bash
curl http://192.168.49.2:30090/api/health
```

## Step 6 — Monitor with k9s

```bash
k9s -n server
```

### Useful k9s commands (inside k9s)

| Key | Action |
|-----|--------|
| `0` | Show all pods |
| `:deploy` | List deployments |
| `:sts` | List statefulsets |
| `:svc` | List services |
| Arrow keys | Select a pod |
| `l` | Tail logs |
| `s` | Shell into the container |
| `ctrl+d` | Describe (events, config) |
| `y` | View YAML |
| `ctrl+k` | Delete selected resource |
| `e` | Edit the resource |

### Common debug actions

```bash
# Check logs
MINIKUBE_HOME=/home/coderx85/minikube-ext kubectl logs -n server tigerbeetle-0

# Shell into a pod
MINIKUBE_HOME=/home/coderx85/minikube-ext kubectl exec -it -n server deployment/backend-server -- sh

# Restart a pod
MINIKUBE_HOME=/home/coderx85/minikube-ext kubectl delete pod -n server -l app=backend-server

# Describe a pod (see events, OOM reason, etc.)
MINIKUBE_HOME=/home/coderx85/minikube-ext kubectl describe pod -n server tigerbeetle-0
```

## Step 7 — Tear down

```bash
MINIKUBE_HOME=/home/coderx85/minikube-ext kubectl delete -k k8s/kube-dev/
```

Or to fully remove the cluster:

```bash
MINIKUBE_HOME=/home/coderx85/minikube-ext minikube delete -p ext
```

---

## Environment variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `NODE_ENV` | `development` | App environment |
| `PORT` | `3000` | Server listen port |
| `DATABASE_URL` | `postgresql://postgres:postgres@postgres:5432/wave_db` | Postgres connection |
| `TB_HOST` | `tigerbeetle.server.svc.cluster.local` | TigerBeetle DNS hostname |
| `TB_PORT` | `4343` | TigerBeetle port |

> **Note:** `TB_HOST`/`TB_PORT` are used instead of `TIGERBEETLE_ADDRESS`/`TIGERBEETLE_PORT` to avoid collision with Kubernetes auto-generated service env vars (`TIGERBEETLE_SERVICE_HOST`, `TIGERBEETLE_PORT`, etc.).

## Files reference

| File | What it creates |
|------|----------------|
| `namespace.yaml` | `server` namespace |
| `configmap.yaml` | `server-config` with env vars |
| `statefulset.yaml` | Postgres + TigerBeetle StatefulSets (with volumeClaimTemplates) |
| `deployment.yaml` | `backend-server` Deployment |
| `service.yaml` | postgres(ClusterIP), tigerbeetle(ClusterIP), backend-server(NodePort :30090) |
| `kustomization.yaml` | Resource list for `kubectl apply -k` |
