package com.Datium.Datium.controller;

import com.Datium.Datium.dto.InvitationRequest;
import com.Datium.Datium.entity.SystemShare;
import com.Datium.Datium.repository.SystemRepository;
import com.Datium.Datium.repository.SystemShareRepository;
import com.Datium.Datium.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/systems")
public class InvitationController {

    @Autowired
    private SystemShareRepository systemShareRepository;

    @Autowired
    private SystemRepository systemRepository;

    @Autowired
    private JwtUtil jwtUtil;

    private Integer getUserIdFromToken(String token) {
        if (token != null && token.startsWith("Bearer ")) {
            token = token.substring(7);
            try {
                String email = jwtUtil.extractEmail(token);
                if (jwtUtil.validateToken(token, email)) {
                    return jwtUtil.extractUserId(token);
                }
            } catch (Exception e) {
                return null;
            }
        }
        return null;
    }

    @PostMapping("/{id}/invite")
    public ResponseEntity<?> inviteUser(@PathVariable Integer id, @RequestBody InvitationRequest request,
                                        @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

            com.Datium.Datium.entity.System system = systemRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Sistema no encontrado"));

            if (!system.getOwnerId().equals(userId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "No tienes permisos para invitar en este sistema"));
            }

            if (systemShareRepository.findBySystemIdAndUserEmail(id, request.getEmail()).isPresent()) {
                 return ResponseEntity.badRequest().body(Map.of("message", "El usuario ya está invitado a este sistema"));
            }

            SystemShare share = new SystemShare();
            share.setSystemId(id);
            share.setUserEmail(request.getEmail());
            share.setPermissionLevel(request.getPermission() != null ? request.getPermission() : "VIEWER");
            share.setStatus("ACCEPTED");

            systemShareRepository.save(share);

            return ResponseEntity.ok(Map.of("message", "Invitación enviada correctamente"));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Error al procesar invitación"));
        }
    }
    
    @GetMapping("/{id}/invitations")
    public ResponseEntity<?> getInvitations(@PathVariable Integer id,
                                           @RequestHeader(value = "Authorization", required = false) String token) {
        try {
             Integer userId = getUserIdFromToken(token);
            if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

            com.Datium.Datium.entity.System system = systemRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Sistema no encontrado"));

            if (!system.getOwnerId().equals(userId)) {
                 return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "No tienes permisos"));
            }
            
            List<SystemShare> shares = systemShareRepository.findBySystemId(id);
            return ResponseEntity.ok(shares);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/{id}/invitations/{shareId}")
     public ResponseEntity<?> revokeInvitation(@PathVariable Integer id, @PathVariable Integer shareId,
                                           @RequestHeader(value = "Authorization", required = false) String token) {
        try {
             Integer userId = getUserIdFromToken(token);
            if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

            com.Datium.Datium.entity.System system = systemRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Sistema no encontrado"));
            
            if (!system.getOwnerId().equals(userId)) {
                 return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "No tienes permisos"));
            }
            
            SystemShare share = systemShareRepository.findById(shareId).orElse(null);
            if (share != null && share.getSystemId().equals(id)) {
                 systemShareRepository.delete(share);
            }
            
            return ResponseEntity.ok().build();

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
