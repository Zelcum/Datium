package com.Datium.Datium.controller;

import com.Datium.Datium.dto.SystemRequest;
import com.Datium.Datium.dto.SystemResponse;
import com.Datium.Datium.dto.SystemStatisticsResponse;
import com.Datium.Datium.service.SystemService;
import com.Datium.Datium.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/systems")
@CrossOrigin(origins = "*")
public class SystemController {

    @Autowired
    private SystemService systemService;

    @Autowired
    private JwtUtil jwtUtil;

    private Integer getUserIdFromToken(String token) {
        if (token == null) {
            java.lang.System.out.println("Token es null");
            return null;
        }
        if (!token.startsWith("Bearer ")) {
            java.lang.System.out.println("Token no empieza con Bearer: " + token.substring(0, Math.min(20, token.length())));
            try {
                return jwtUtil.extractUserId(token);
            } catch (Exception e) {
                java.lang.System.out.println("Error extrayendo userId sin Bearer: " + e.getMessage());
                return null;
            }
        }
        try {
            String jwt = token.substring(7);
            Integer userId = jwtUtil.extractUserId(jwt);
            java.lang.System.out.println("UserId extraído del token: " + userId);
            return userId;
        } catch (Exception e) {
            java.lang.System.out.println("Error extrayendo userId: " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }

    @GetMapping
    public ResponseEntity<?> getAllSystems(
            @RequestHeader(value = "Authorization", required = false) String token) {
        System.out.println("GET /api/sistemas - Token recibido");
        Integer userId = getUserIdFromToken(token);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("{\"error\":\"Token inválido o ausente\"}");
        }
        List<SystemResponse> systems = systemService.getAllSystems(userId);
        return ResponseEntity.ok(systems);
    }

    @GetMapping("/{id}")
    public ResponseEntity<SystemResponse> getSystemById(
            @PathVariable Integer id,
            @RequestHeader(value = "Authorization", required = false) String token) {
        Integer userId = getUserIdFromToken(token);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        SystemResponse system = systemService.getSystemById(id, userId);
        return ResponseEntity.ok(system);
    }

    @PostMapping
    public ResponseEntity<?> createSystem(
            @RequestBody SystemRequest request,
            @RequestHeader(value = "Authorization", required = false) String token) {
        System.out.println("POST /api/sistemas - Creando sistema: " + request.getName());
        Integer userId = getUserIdFromToken(token);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("{\"error\":\"Token inválido o ausente\"}");
        }
        SystemResponse system = systemService.createSystem(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(system);
    }

    @PutMapping("/{id}")
    public ResponseEntity<SystemResponse> updateSystem(
            @PathVariable Integer id,
            @RequestBody SystemRequest request,
            @RequestHeader(value = "Authorization", required = false) String token) {
        Integer userId = getUserIdFromToken(token);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        SystemResponse system = systemService.updateSystem(id, request, userId);
        return ResponseEntity.ok(system);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSystem(
            @PathVariable Integer id,
            @RequestHeader(value = "Authorization", required = false) String token) {
        Integer userId = getUserIdFromToken(token);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        systemService.deleteSystem(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/estadisticas")
    public ResponseEntity<?> getStatistics(
            @RequestHeader(value = "Authorization", required = false) String token) {
        Integer userId = getUserIdFromToken(token);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("{\"error\":\"Token inválido o ausente\"}");
        }
        SystemStatisticsResponse stats = systemService.getStatistics(userId);
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/limites/crear")
    public ResponseEntity<?> getCreateLimit(
            @RequestHeader(value = "Authorization", required = false) String token) {
        Integer userId = getUserIdFromToken(token);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Map<String, Object> response = systemService.getCreateLimit(userId);
        return ResponseEntity.ok(response);
    }
    @PostMapping("/{id}/verify-password")
    public ResponseEntity<?> verifyPassword(
            @PathVariable Integer id,
            @RequestBody Map<String, String> body,
            @RequestHeader(value = "Authorization", required = false) String token) {
        Integer userId = getUserIdFromToken(token);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("{\"error\":\"Token inválido o ausente\"}");
        }
        
        String password = body.get("password");
        boolean isValid = systemService.verifyPassword(id, password);
        
        if (isValid) {
            return ResponseEntity.ok().body("{\"valid\": true}");
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("{\"valid\": false, \"error\": \"Contraseña incorrecta\"}");
        }
    }
}
