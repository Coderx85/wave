# Kubernetes manifests for server/

Files:
- namespace.yaml
- configmap.yaml
- deployment.yaml
- service.yaml

Quick start with minikube:

1. Start minikube:
   minikube start

2. Build image and make it available to minikube:
   # Option A: use minikube's Docker daemon
   eval "$(minikube docker-env)"
   docker build -t server:latest -f Dockerfile ..

   # Option B: use minikube image build (recommended newer minikube)
   minikube image build -t server:latest -f Dockerfile ..

   # Or load an existing image
   minikube image load server:latest

3. Apply manifests:
   kubectl apply -f k8s/

4. Verify:
   kubectl get pods -n server
   kubectl get svc -n server

5. Access:
   minikube service server -n server --url
   # or curl <minikube-ip>:30080

