package com.Datium.Datium.controller;

import com.Datium.Datium.dto.InvitationRequest;
import com.Datium.Datium.dto.InvitationResponse;
import com.Datium.Datium.dto.InvitationSummaryResponse;
import com.Datium.Datium.service.InvitationService;
import com.Datium.Datium.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/invitaciones")
@CrossOrigin(origins = "*")
public class InvitationController {

    @Autowired
    private InvitationService invitationService;

    @Autowired
    private JwtUtil jwtUtil;

    private Integer getUserIdFromToken(String token) {
        if (token == null) return null;
        if (!token.startsWith("Bearer ")) {
            try {
                return jwtUtil.extractUserId(token);
            } catch (Exception e) {
                return null;
            }
        }
        try {
            String jwt = token.substring(7);
            return jwtUtil.extractUserId(jwt);
        } catch (Exception e) {
            return null;
        }
    }

    private String getUserEmailFromToken(String token) {
        if (token == null) return null;
        try {
            String jwt = token.startsWith("Bearer ") ? token.substring(7) : token;
            return jwtUtil.extractSubject(jwt);
        } catch (Exception e) {
            return null;
        }
    }

    @PostMapping
    public ResponseEntity<?> createInvitation(
            @RequestBody InvitationRequest request,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Token inválido o ausente"));
            }

            InvitationResponse response = invitationService.createInvitation(request, userId);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Error al crear invitación: " + e.getMessage()));
        }
    }

    @GetMapping("/recibidas")
    public ResponseEntity<?> getReceivedInvitations(
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            String userEmail = getUserEmailFromToken(token);

            java.lang.System.out.println("GET /recibidas - userId: " + userId + ", userEmail: " + userEmail);

            if (userEmail == null) {
                java.lang.System.out.println("Error: userEmail es null");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Token inválido o ausente"));
            }

            List<InvitationResponse> invitations = invitationService.getReceivedInvitations(userEmail, userId);
            java.lang.System.out.println("Invitaciones recibidas encontradas: " + invitations.size());
            return ResponseEntity.ok(invitations);
        } catch (Exception e) {
            java.lang.System.out.println("Error en getReceivedInvitations: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Error al obtener invitaciones: " + e.getMessage()));
        }
    }

    @GetMapping("/enviadas")
    public ResponseEntity<?> getSentInvitations(
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            java.lang.System.out.println("GET /enviadas - userId: " + userId);
            
            if (userId == null) {
                java.lang.System.out.println("Error: userId es null");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Token inválido o ausente"));
            }

            List<InvitationResponse> invitations = invitationService.getSentInvitations(userId);
            java.lang.System.out.println("Invitaciones enviadas encontradas: " + invitations.size());
            return ResponseEntity.ok(invitations);
        } catch (Exception e) {
            java.lang.System.out.println("Error en getSentInvitations: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Error al obtener invitaciones: " + e.getMessage()));
        }
    }

    @PostMapping("/{id}/aceptar")
    public ResponseEntity<?> acceptInvitation(
            @PathVariable Integer id,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            String userEmail = getUserEmailFromToken(token);

            if (userEmail == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Token inválido o ausente"));
            }

            InvitationResponse response = invitationService.acceptInvitation(id, userId, userEmail);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Error al aceptar invitación: " + e.getMessage()));
        }
    }

    @PostMapping("/{id}/rechazar")
    public ResponseEntity<?> rejectInvitation(
            @PathVariable Integer id,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            String userEmail = getUserEmailFromToken(token);

            if (userEmail == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Token inválido o ausente"));
            }

            InvitationResponse response = invitationService.rejectInvitation(id, userId, userEmail);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Error al rechazar invitación: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> cancelInvitation(
            @PathVariable Integer id,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Token inválido o ausente"));
            }

            invitationService.cancelInvitation(id, userId);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Error al cancelar invitación: " + e.getMessage()));
        }
    }

    @PostMapping("/{id}/reenviar")
    public ResponseEntity<?> resendInvitation(
            @PathVariable Integer id,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Token inválido o ausente"));
            }

            InvitationResponse response = invitationService.resendInvitation(id, userId);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Error al reenviar invitación: " + e.getMessage()));
        }
    }

    @GetMapping("/resumen")
    public ResponseEntity<?> getSummary(
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            String userEmail = getUserEmailFromToken(token);

            java.lang.System.out.println("GET /resumen - userId: " + userId + ", userEmail: " + userEmail);

            if (userEmail == null) {
                java.lang.System.out.println("Error: userEmail es null en resumen");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Token inválido o ausente"));
            }

            InvitationSummaryResponse summary = invitationService.getSummary(userId, userEmail);
            java.lang.System.out.println("Resumen - pendingReceived: " + summary.getPendingReceived() + 
                ", pendingSent: " + summary.getPendingSent());
            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            java.lang.System.out.println("Error en getSummary: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Error al obtener resumen: " + e.getMessage()));
        }
    }

    @PutMapping("/sistemas/{systemId}/usuarios/{userId}/rol")
    public ResponseEntity<?> updateUserRole(
            @PathVariable Integer systemId,
            @PathVariable Integer userId,
            @RequestBody Map<String, String> request,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer requesterId = getUserIdFromToken(token);
            if (requesterId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Token inválido o ausente"));
            }

            String newRole = request.get("role");
            if (newRole == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Rol no especificado"));
            }

            invitationService.updateInvitedUserRole(systemId, userId, newRole, requesterId);
            return ResponseEntity.ok(Map.of("message", "Rol actualizado exitosamente"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Error al actualizar rol: " + e.getMessage()));
        }
    }

    @DeleteMapping("/sistemas/{systemId}/usuarios/{userId}")
    public ResponseEntity<?> removeUser(
            @PathVariable Integer systemId,
            @PathVariable Integer userId,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer requesterId = getUserIdFromToken(token);
            if (requesterId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Token inválido o ausente"));
            }

            invitationService.removeInvitedUser(systemId, userId, requesterId);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Error al eliminar usuario: " + e.getMessage()));
        }
    }
}

