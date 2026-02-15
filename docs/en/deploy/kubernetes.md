# Kubernetes Deployment

## Deploy with Kustomize

```bash
# Development environment
kubectl apply -k k8s/base

# Production environment
kubectl apply -k k8s/overlays/production
```

## View Status

```bash
kubectl get pods -n openchat
kubectl get svc -n openchat
```

## View Logs

```bash
kubectl logs -f deployment/openchat-server -n openchat
```

## Configuration

### Namespace

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: openchat
```

### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: openchat-server
  namespace: openchat
spec:
  replicas: 3
  selector:
    matchLabels:
      app: openchat-server
  template:
    spec:
      containers:
        - name: openchat
          image: openchat/server:latest
          ports:
            - containerPort: 3000
```

### Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: openchat-service
  namespace: openchat
spec:
  type: LoadBalancer
  ports:
    - port: 80
      targetPort: 3000
  selector:
    app: openchat-server
```

## Next Steps

- [Docker Deployment](./docker.md) - Docker deployment
- [Configuration](../config/) - Server configuration
