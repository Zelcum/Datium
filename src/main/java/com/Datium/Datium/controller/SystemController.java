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
@RequestMapping("/api/sistemas")
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
        try {
            System.out.println("GET /api/sistemas - Token recibido: " + (token != null ? token.substring(0, Math.min(20, token.length())) + "..." : "null"));
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                System.out.println("Token missing or invalid, returning unauthorized");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("{\"error\":\"Token inválido o ausente\"}");
            }
            List<SystemResponse> systems = systemService.getAllSystems(userId);
            System.out.println("Sistemas encontrados: " + systems.size());
            return ResponseEntity.ok(systems);
        } catch (Exception e) {
            System.err.println("Error en getAllSystems: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<SystemResponse> getSystemById(
            @PathVariable Integer id,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            SystemResponse system = systemService.getSystemById(id, userId);
            return ResponseEntity.ok(system);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping
    public ResponseEntity<?> createSystem(
            @RequestBody SystemRequest request,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            java.lang.System.out.println("POST /api/sistemas - Creando sistema: " + request.getName());
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                java.lang.System.out.println("Error: userId es null");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("{\"error\":\"Token inválido o ausente\"}");
            }
            java.lang.System.out.println("UserId: " + userId);
            SystemResponse system = systemService.createSystem(request, userId);
            java.lang.System.out.println("Sistema creado exitosamente con ID: " + system.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(system);
        } catch (Exception e) {
            java.lang.System.err.println("Error creando sistema: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<SystemResponse> updateSystem(
            @PathVariable Integer id,
            @RequestBody SystemRequest request,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            SystemResponse system = systemService.updateSystem(id, request, userId);
            return ResponseEntity.ok(system);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSystem(
            @PathVariable Integer id,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            systemService.deleteSystem(id, userId);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/estadisticas")
    public ResponseEntity<?> getStatistics(
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            java.lang.System.out.println("GET /api/sistemas/estadisticas - Token recibido");
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                java.lang.System.err.println("getStatistics: userId es null después de extraer del token");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("{\"error\":\"Token inválido o ausente\"}");
            }
            java.lang.System.out.println("getStatistics: Usuario autenticado - userId: " + userId);
            SystemStatisticsResponse stats = systemService.getStatistics(userId);
            java.lang.System.out.println("getStatistics: Estadísticas calculadas - Total sistemas: " + stats.getTotalSystems());
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            java.lang.System.err.println("Error en getStatistics: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    @GetMapping("/limites/crear")
    public ResponseEntity<?> getCreateLimit(
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            Map<String, Object> response = systemService.getCreateLimit(userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}

