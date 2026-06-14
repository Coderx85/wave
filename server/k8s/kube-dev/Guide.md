# kube-dev — Manual step-by-step guide

## Prerequisites

You already have:
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

```bash
# Build with your default Docker daemon
docker build -t server:latest -f Dockerfile ..

# Load the image into minikube's internal Docker
MINIKUBE_HOME=/home/coderx85/minikube-ext minikube image load server:latest -p ext
```

## Step 3 — Deploy

```bash
kubectl apply -k k8s/kube-dev/
```

You should see:
```
namespace/server created
configmap/server-config created
service/backend-server created
service/postgres created
service/tigerbeetle created
persistentvolumeclaim/postgres-data created
persistentvolumeclaim/tigerbeetle-data created
deployment.apps/backend-server created
statefulset.apps/postgres created
statefulset.apps/tigerbeetle created
```

## Step 4 — Watch pods

```bash
kubectl get pods -n server -w
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
> **If backend-server shows ImagePullBackOff** — the image didn't load. Run `minikube image load server:latest` again, then `kubectl delete pod -n server -l app=backend-server` to force a restart.

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
kubectl logs -n server tigerbeetle-0

# Shell into a pod
kubectl exec -it -n server deployment/backend-server -- sh

# Restart a pod
kubectl delete pod -n server -l app=backend-server

# Describe a pod (see events, OOM reason, etc.)
kubectl describe pod -n server tigerbeetle-0
```

## Step 7 — Tear down

```bash
kubectl delete -k k8s/kube-dev/
```

Or to fully remove the cluster:

```bash
MINIKUBE_HOME=/home/coderx85/minikube-ext minikube delete -p ext
```

---

## Files reference

| File | What it creates |
|------|----------------|
| `namespace.yaml` | `server` namespace |
| `configmap.yaml` | `server-config` with `NODE_ENV`, `PORT`, `DATABASE_URL` |
| `pvc.yaml` | `postgres-data` (1Gi), `tigerbeetle-data` (1Gi) |
| `statefulset.yaml` | Postgres + TigerBeetle StatefulSets |
| `deployment.yaml` | `backend-server` Deployment |
| `service.yaml` | postgres(ClusterIP), tigerbeetle(ClusterIP), backend-server(NodePort :30090) |
| `kustomization.yaml` | Resource list for `kubectl apply -k` |
