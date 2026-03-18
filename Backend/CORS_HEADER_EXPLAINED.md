# WHERE IS 'Access-Control-Allow-Origin' DEFINED?

## TL;DR

**It's defined in your API Gateway configuration** at:
`Backend/api-gateway/src/main/resources/application.yml` (lines 12-14)

## DETAILED EXPLANATION

### 1. WHERE IT'S CONFIGURED

**File:** `Backend/api-gateway/src/main/resources/application.yml`

```yaml
spring:
  cloud:
    gateway:
      globalcors:                    # ← Global CORS configuration
        cors-configurations:
          '[/**]':                   # ← Apply to ALL routes
            allowedOriginPatterns:   # ← THIS BECOMES Access-Control-Allow-Origin
              - "http://localhost:*"
              - "http://127.0.0.1:*"
            allowedMethods:          # ← THIS BECOMES Access-Control-Allow-Methods
              - GET
              - POST
              - PUT
              - PATCH
              - DELETE
              - OPTIONS
            allowedHeaders:          # ← THIS BECOMES Access-Control-Allow-Headers
              - "*"
            exposedHeaders:          # ← THIS BECOMES Access-Control-Expose-Headers
              - "Authorization"
              - "Content-Type"
            allowCredentials: true   # ← THIS BECOMES Access-Control-Allow-Credentials
            maxAge: 3600            # ← THIS BECOMES Access-Control-Max-Age
```

### 2. HOW IT BECOMES AN HTTP HEADER

Spring Cloud Gateway **automatically converts** these YAML settings into HTTP response headers:

```
YAML Config                    →    HTTP Response Header
─────────────────────────────────────────────────────────────────
allowedOriginPatterns          →    Access-Control-Allow-Origin: http://localhost:5173
allowedMethods                 →    Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
allowedHeaders                 →    Access-Control-Allow-Headers: *
exposedHeaders                 →    Access-Control-Expose-Headers: Authorization, Content-Type
allowCredentials: true         →    Access-Control-Allow-Credentials: true
maxAge: 3600                   →    Access-Control-Max-Age: 3600
```

### 3. WHEN THE HEADER IS ADDED

Spring Cloud Gateway adds these headers **automatically** at two points:

#### A. OPTIONS Preflight Request (browser asks permission)

```http
Browser sends:
  OPTIONS /api/companies HTTP/1.1
  Origin: http://localhost:5173
  Access-Control-Request-Method: GET
  
Gateway responds:
  HTTP/1.1 200 OK
  Access-Control-Allow-Origin: http://localhost:5173    ← Added by Gateway
  Access-Control-Allow-Methods: GET, POST, PUT, ...     ← Added by Gateway
  Access-Control-Allow-Headers: *                       ← Added by Gateway
  Access-Control-Allow-Credentials: true                ← Added by Gateway
```

#### B. Actual Request (browser makes real call)

```http
Browser sends:
  GET /api/companies HTTP/1.1
  Origin: http://localhost:5173
  Authorization: Bearer eyJ...
  
Gateway responds:
  HTTP/1.1 200 OK
  Access-Control-Allow-Origin: http://localhost:5173    ← Added by Gateway
  Access-Control-Allow-Credentials: true                ← Added by Gateway
  Content-Type: application/json
  
  [... response data ...]
```

### 4. THE CODE BEHIND IT (Spring Cloud Gateway)

Under the hood, Spring Cloud Gateway uses `CorsWebFilter`:

```java
// Spring Cloud Gateway Internal Code (you don't write this)
public class CorsWebFilter {
    
    public Mono<Void> filter(ServerWebExchange exchange, ...) {
        // Read your YAML config
        CorsConfiguration config = getCorsConfiguration(exchange);
        
        // Check if request is CORS
        if (CorsUtils.isCorsRequest(request)) {
            // Add Access-Control-Allow-Origin header
            response.getHeaders().add(
                "Access-Control-Allow-Origin", 
                determineAllowedOrigin(request, config)  // Uses your allowedOriginPatterns
            );
            
            // Add other CORS headers
            response.getHeaders().add("Access-Control-Allow-Credentials", "true");
            response.getHeaders().addAll("Access-Control-Allow-Methods", config.getAllowedMethods());
            // ... etc
        }
    }
}
```

You don't write this code - Spring does it for you based on your YAML config!

### 5. WHY YOU HAD DUPLICATE HEADERS

**Before the fix:**

```
API Gateway application.yml:
  allowedOriginPatterns: ["http://localhost:*"]  ← Adds header

+ 

auth-service SecurityConfig.java:
  configuration.setAllowedOriginPatterns(List.of("*"));  ← ALSO adds header

= 

HTTP Response:
  Access-Control-Allow-Origin: http://localhost:5173
  Access-Control-Allow-Origin: *
  ↑ DUPLICATE HEADER = BROWSER ERROR
```

**After the fix:**

```
API Gateway application.yml:
  allowedOriginPatterns: ["http://localhost:*"]  ← Adds header

auth-service SecurityConfig.java:
  (NO CORS CONFIG)  ← Doesn't add header

= 

HTTP Response:
  Access-Control-Allow-Origin: http://localhost:5173
  ↑ SINGLE HEADER = WORKS!
```

## HOW TO SEE THE ACTUAL HEADER

### Method 1: Browser DevTools

1. Open frontend in browser (http://localhost:5173)
2. Press F12 (DevTools)
3. Go to **Network** tab
4. Make a request (e.g., login or fetch companies)
5. Click on the request
6. Look at **Response Headers** section

You should see:
```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Credentials: true
```

### Method 2: curl Command

```bash
# Test OPTIONS preflight
curl -i -X OPTIONS http://localhost:8080/auth/login \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST"

# You'll see in response:
# Access-Control-Allow-Origin: http://localhost:5173
# Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
```

### Method 3: Check Gateway Logs

```bash
# Enable debug logging for CORS
# Add to api-gateway/src/main/resources/application.yml:

logging:
  level:
    org.springframework.cloud.gateway: DEBUG
    org.springframework.web.cors: DEBUG

# Then restart and check logs
tail -f Backend/logs/api-gateway.log | grep -i cors
```

## MAPPING REFERENCE

Here's the complete mapping of your configuration to HTTP headers:

| YAML Config                          | Line | HTTP Response Header                                    |
|--------------------------------------|------|---------------------------------------------------------|
| `allowedOriginPatterns`              | 12   | `Access-Control-Allow-Origin: <matched-origin>`         |
| `- "http://localhost:*"`             | 13   | Matches any localhost port (e.g., 5173, 3000)           |
| `- "http://127.0.0.1:*"`             | 14   | Matches any 127.0.0.1 port                              |
| `allowedMethods`                     | 15   | `Access-Control-Allow-Methods: GET,POST,PUT,...`        |
| `- GET, POST, PUT...`                | 16-21| Lists which HTTP methods are allowed                    |
| `allowedHeaders`                     | 22   | `Access-Control-Allow-Headers: *`                       |
| `- "*"`                              | 23   | Allows ALL request headers                              |
| `exposedHeaders`                     | 24   | `Access-Control-Expose-Headers: Authorization,...`      |
| `- "Authorization", "Content-Type"`  | 25-26| JS can read these headers from response                 |
| `allowCredentials: true`             | 27   | `Access-Control-Allow-Credentials: true`                |
| `maxAge: 3600`                       | 28   | `Access-Control-Max-Age: 3600`                          |

## WHAT HAPPENS WHEN REQUEST ARRIVES

```
1. Browser sends request to: http://localhost:8080/api/companies
   with header: Origin: http://localhost:5173

2. Request hits API Gateway (port 8080)

3. Gateway checks CORS config (application.yml lines 12-28)

4. Gateway sees:
   - Request origin: http://localhost:5173
   - Allowed pattern: http://localhost:*
   - Match! ✓

5. Gateway adds headers:
   Access-Control-Allow-Origin: http://localhost:5173
   Access-Control-Allow-Credentials: true

6. Gateway routes request to stock-service (port 8082)

7. Stock-service processes request (NO CORS headers added)

8. Stock-service returns response to Gateway

9. Gateway adds CORS headers to response

10. Browser receives response with CORS headers → Success!
```

## SUMMARY

**Where defined:**  
`Backend/api-gateway/src/main/resources/application.yml` lines 12-28

**How it's added:**  
Spring Cloud Gateway automatically converts YAML config to HTTP headers

**When it's added:**  
On every response from the Gateway (for CORS requests)

**Why you had problems:**  
Services were ALSO adding the header → duplicate → browser error

**Current status:**  
Only Gateway adds header → no duplicates → works!

Check `application.yml` line 12-14 to see where `Access-Control-Allow-Origin` comes from!
