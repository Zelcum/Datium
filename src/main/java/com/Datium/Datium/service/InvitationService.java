package com.Datium.Datium.service;

import com.Datium.Datium.dto.InvitationRequest;
import com.Datium.Datium.dto.InvitationResponse;
import com.Datium.Datium.dto.InvitationSummaryResponse;
import com.Datium.Datium.entity.*;
import com.Datium.Datium.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class InvitationService {

    @Autowired
    private SystemInvitationRepository invitationRepository;

    @Autowired
    private InvitationAuditRepository auditRepository;

    @Autowired
    private SystemRepository systemRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SystemUserRepository systemUserRepository;

    @Autowired
    private SystemUserPasswordRepository systemUserPasswordRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Transactional
    public InvitationResponse createInvitation(InvitationRequest request, Integer inviterId) {
        com.Datium.Datium.entity.System system = systemRepository.findById(request.getSystemId())
            .orElseThrow(() -> new RuntimeException("Sistema no encontrado"));

        if (!system.getOwnerId().equals(inviterId)) {
            throw new RuntimeException("Solo el propietario puede invitar usuarios");
        }

        User inviter = userRepository.findById(inviterId)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        if (inviter.getEmail().equalsIgnoreCase(request.getInviteeEmail())) {
            throw new RuntimeException("No puedes invitarte a ti mismo");
        }

        Optional<User> existingUser = userRepository.findByEmail(request.getInviteeEmail());
        if (existingUser.isPresent()) {
            boolean alreadyInSystem = systemUserRepository.existsBySystemIdAndUserId(
                request.getSystemId(), existingUser.get().getId());
            if (alreadyInSystem) {
                throw new RuntimeException("El usuario ya tiene acceso a este sistema");
            }
        }

        if (invitationRepository.existsBySystemIdAndInviteeEmailAndStatus(
            request.getSystemId(), request.getInviteeEmail(), SystemInvitation.Status.pending)) {
            throw new RuntimeException("Ya existe una invitación pendiente para este usuario");
        }

        User owner = userRepository.findById(system.getOwnerId())
            .orElseThrow(() -> new RuntimeException("Propietario no encontrado"));
        
        Long currentUsers = systemUserRepository.countBySystemId(system.getId());
        int maxUsers = 500;
        if (owner.getPlanId() != null) {
        }

        if (currentUsers >= maxUsers) {
            throw new RuntimeException("Se ha alcanzado el límite máximo de usuarios para este sistema");
        }

        SystemInvitation invitation = new SystemInvitation();
        invitation.setSystemId(request.getSystemId());
        invitation.setInviterId(inviterId);
        invitation.setInviteeEmail(request.getInviteeEmail().toLowerCase());
        
        if (existingUser.isPresent()) {
            invitation.setInviteeId(existingUser.get().getId());
        }

        try {
            invitation.setRole(SystemInvitation.Role.valueOf(request.getRole()));
        } catch (IllegalArgumentException e) {
            invitation.setRole(SystemInvitation.Role.viewer);
        }

        try {
            invitation.setAccessType(SystemInvitation.AccessType.valueOf(request.getAccessType()));
        } catch (IllegalArgumentException e) {
            invitation.setAccessType(SystemInvitation.AccessType.none);
        }

        if (invitation.getAccessType() == SystemInvitation.AccessType.individual 
            && request.getIndividualPassword() != null 
            && !request.getIndividualPassword().isEmpty()) {
            invitation.setIndividualPasswordHash(passwordEncoder.encode(request.getIndividualPassword()));
        }

        int expirationDays = request.getExpirationDays() != null ? request.getExpirationDays() : 30;
        invitation.setExpiresAt(LocalDateTime.now().plusDays(expirationDays));

        invitation.setStatus(SystemInvitation.Status.pending);
        invitation = invitationRepository.save(invitation);

        createAudit(invitation.getId(), "CREATED", inviterId, 
            "Invitación creada para " + request.getInviteeEmail());

        return convertToResponse(invitation);
    }

    public List<InvitationResponse> getReceivedInvitations(String userEmail, Integer userId) {
        java.lang.System.out.println("getReceivedInvitations - userEmail: " + userEmail + ", userId: " + userId);
        
        List<SystemInvitation> invitations = new ArrayList<>();
        java.util.Set<Integer> invitationIds = new java.util.HashSet<>();
        
        if (userId != null) {
            List<SystemInvitation> byId = invitationRepository.findByInviteeId(userId);
            java.lang.System.out.println("Invitaciones encontradas por userId: " + byId.size());
            for (SystemInvitation inv : byId) {
                if (!invitationIds.contains(inv.getId())) {
                    invitations.add(inv);
                    invitationIds.add(inv.getId());
                }
            }
        }
        
        List<SystemInvitation> byEmail = invitationRepository.findByInviteeEmail(userEmail.toLowerCase());
        java.lang.System.out.println("Invitaciones encontradas por email: " + byEmail.size());
        for (SystemInvitation inv : byEmail) {
            if (!invitationIds.contains(inv.getId())) {
                invitations.add(inv);
                invitationIds.add(inv.getId());
            }
        }

        java.lang.System.out.println("Total invitaciones recibidas: " + invitations.size());
        return invitations.stream()
            .map(this::convertToResponse)
            .filter(r -> r != null)
            .collect(Collectors.toList());
    }

    public List<InvitationResponse> getSentInvitations(Integer inviterId) {
        java.lang.System.out.println("getSentInvitations - inviterId: " + inviterId);
        List<SystemInvitation> invitations = invitationRepository.findByInviterId(inviterId);
        java.lang.System.out.println("Invitaciones enviadas encontradas: " + invitations.size());
        return invitations.stream()
            .map(this::convertToResponse)
            .filter(r -> r != null)
            .collect(Collectors.toList());
    }

    @Transactional
    public InvitationResponse acceptInvitation(Integer invitationId, Integer userId, String userEmail) {
        SystemInvitation invitation = invitationRepository.findById(invitationId)
            .orElseThrow(() -> new RuntimeException("Invitación no encontrada"));

        if (userId != null) {
            if (invitation.getInviteeId() != null && !invitation.getInviteeId().equals(userId)) {
                throw new RuntimeException("Esta invitación no es para ti");
            }
        } else {
            if (!invitation.getInviteeEmail().equalsIgnoreCase(userEmail)) {
                throw new RuntimeException("Esta invitación no es para ti");
            }
        }

        if (invitation.getStatus() != SystemInvitation.Status.pending) {
            throw new RuntimeException("Esta invitación ya fue procesada");
        }

        if (invitation.getExpiresAt() != null && invitation.getExpiresAt().isBefore(LocalDateTime.now())) {
            invitation.setStatus(SystemInvitation.Status.expired);
            invitationRepository.save(invitation);
            throw new RuntimeException("Esta invitación ha expirado");
        }

        User user;
        if (userId != null) {
            user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        } else {
            Optional<User> existingUser = userRepository.findByEmail(userEmail);
            if (existingUser.isPresent()) {
                user = existingUser.get();
            } else {
                throw new RuntimeException("Debes crear una cuenta primero");
            }
        }

        SystemUser systemUser = new SystemUser();
        systemUser.setSystemId(invitation.getSystemId());
        systemUser.setUserId(user.getId());
        systemUser.setRole(SystemUser.Role.valueOf(invitation.getRole().name()));
        systemUserRepository.save(systemUser);

        if (invitation.getAccessType() == SystemInvitation.AccessType.individual 
            && invitation.getIndividualPasswordHash() != null) {
            SystemUserPassword password = new SystemUserPassword();
            password.setSystemId(invitation.getSystemId());
            password.setUserId(user.getId());
            password.setPasswordHash(invitation.getIndividualPasswordHash());
            systemUserPasswordRepository.save(password);
        }

        invitation.setStatus(SystemInvitation.Status.accepted);
        invitation.setAcceptedAt(LocalDateTime.now());
        invitation.setInviteeId(user.getId());
        invitationRepository.save(invitation);

        createAudit(invitation.getId(), "ACCEPTED", user.getId(), 
            "Invitación aceptada por " + user.getEmail());

        return convertToResponse(invitation);
    }

    @Transactional
    public InvitationResponse rejectInvitation(Integer invitationId, Integer userId, String userEmail) {
        SystemInvitation invitation = invitationRepository.findById(invitationId)
            .orElseThrow(() -> new RuntimeException("Invitación no encontrada"));

        if (userId != null) {
            if (invitation.getInviteeId() != null && !invitation.getInviteeId().equals(userId)) {
                throw new RuntimeException("Esta invitación no es para ti");
            }
        } else {
            if (!invitation.getInviteeEmail().equalsIgnoreCase(userEmail)) {
                throw new RuntimeException("Esta invitación no es para ti");
            }
        }

        if (invitation.getStatus() != SystemInvitation.Status.pending) {
            throw new RuntimeException("Esta invitación ya fue procesada");
        }

        invitation.setStatus(SystemInvitation.Status.rejected);
        invitation.setRejectedAt(LocalDateTime.now());
        invitationRepository.save(invitation);

        Integer performedBy = userId != null ? userId : null;
        createAudit(invitation.getId(), "REJECTED", performedBy, 
            "Invitación rechazada");

        return convertToResponse(invitation);
    }

    @Transactional
    public void cancelInvitation(Integer invitationId, Integer inviterId) {
        SystemInvitation invitation = invitationRepository.findById(invitationId)
            .orElseThrow(() -> new RuntimeException("Invitación no encontrada"));

        if (!invitation.getInviterId().equals(inviterId)) {
            throw new RuntimeException("Solo puedes cancelar tus propias invitaciones");
        }

        if (invitation.getStatus() != SystemInvitation.Status.pending) {
            throw new RuntimeException("Solo se pueden cancelar invitaciones pendientes");
        }

        invitation.setStatus(SystemInvitation.Status.cancelled);
        invitationRepository.save(invitation);

        createAudit(invitation.getId(), "CANCELLED", inviterId, 
            "Invitación cancelada por el remitente");
    }

    @Transactional
    public InvitationResponse resendInvitation(Integer invitationId, Integer inviterId) {
        SystemInvitation original = invitationRepository.findById(invitationId)
            .orElseThrow(() -> new RuntimeException("Invitación no encontrada"));

        if (!original.getInviterId().equals(inviterId)) {
            throw new RuntimeException("Solo puedes reenviar tus propias invitaciones");
        }

        InvitationRequest request = new InvitationRequest();
        request.setSystemId(original.getSystemId());
        request.setInviteeEmail(original.getInviteeEmail());
        request.setRole(original.getRole().name());
        request.setAccessType(original.getAccessType().name());
        request.setExpirationDays(30);

        original.setStatus(SystemInvitation.Status.cancelled);
        invitationRepository.save(original);

        return createInvitation(request, inviterId);
    }

    public InvitationSummaryResponse getSummary(Integer userId, String userEmail) {
        InvitationSummaryResponse summary = new InvitationSummaryResponse();
        summary.setPendingReceived(0L);
        summary.setPendingSent(0L);
        summary.setAccepted(0L);
        summary.setRejected(0L);
        summary.setExpired(0L);
        summary.setTotal(0L);

        if (userEmail == null || userEmail.isEmpty()) {
            return summary;
        }

        java.util.Set<Integer> receivedIds = new java.util.HashSet<>();
        List<SystemInvitation> receivedPending = invitationRepository.findByInviteeEmailAndStatus(
            userEmail.toLowerCase(), SystemInvitation.Status.pending);
        for (SystemInvitation inv : receivedPending) {
            receivedIds.add(inv.getId());
        }

        if (userId != null) {
            List<SystemInvitation> byId = invitationRepository.findByInviteeIdAndStatus(
                userId, SystemInvitation.Status.pending);
            for (SystemInvitation inv : byId) {
                if (!receivedIds.contains(inv.getId())) {
                    receivedPending.add(inv);
                    receivedIds.add(inv.getId());
                }
            }
        }
        summary.setPendingReceived((long) receivedPending.size());

        if (userId != null) {
            List<SystemInvitation> sent = invitationRepository.findByInviterId(userId);
            summary.setPendingSent(sent.stream()
                .filter(i -> i.getStatus() == SystemInvitation.Status.pending)
                .count());
            summary.setAccepted(sent.stream()
                .filter(i -> i.getStatus() == SystemInvitation.Status.accepted)
                .count());
            summary.setRejected(sent.stream()
                .filter(i -> i.getStatus() == SystemInvitation.Status.rejected)
                .count());
            summary.setExpired(sent.stream()
                .filter(i -> i.getStatus() == SystemInvitation.Status.expired)
                .count());
            summary.setTotal((long) sent.size());
        }

        return summary;
    }

    @Transactional
    public void updateInvitedUserRole(Integer systemId, Integer userId, String newRole, Integer requesterId) {
        com.Datium.Datium.entity.System system = systemRepository.findById(systemId)
            .orElseThrow(() -> new RuntimeException("Sistema no encontrado"));

        if (!system.getOwnerId().equals(requesterId)) {
            throw new RuntimeException("Solo el propietario puede cambiar roles");
        }

        SystemUser systemUser = systemUserRepository.findBySystemIdAndUserId(systemId, userId)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado en el sistema"));

        try {
            systemUser.setRole(SystemUser.Role.valueOf(newRole));
            systemUserRepository.save(systemUser);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Rol inválido");
        }
    }

    @Transactional
    public void removeInvitedUser(Integer systemId, Integer userId, Integer requesterId) {
        com.Datium.Datium.entity.System system = systemRepository.findById(systemId)
            .orElseThrow(() -> new RuntimeException("Sistema no encontrado"));

        if (!system.getOwnerId().equals(requesterId)) {
            throw new RuntimeException("Solo el propietario puede eliminar usuarios");
        }

        SystemUser systemUser = systemUserRepository.findBySystemIdAndUserId(systemId, userId)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado en el sistema"));

        systemUserRepository.delete(systemUser);

        systemUserPasswordRepository.findBySystemIdAndUserId(systemId, userId)
            .ifPresent(systemUserPasswordRepository::delete);
    }

    @Scheduled(cron = "0 0 * * * ?")
    @Transactional
    public void expireOldInvitations() {
        List<SystemInvitation> expired = invitationRepository.findExpiredInvitations(LocalDateTime.now());
        for (SystemInvitation invitation : expired) {
            if (invitation.getStatus() == SystemInvitation.Status.pending) {
                invitation.setStatus(SystemInvitation.Status.expired);
                invitationRepository.save(invitation);
                createAudit(invitation.getId(), "EXPIRED", null, 
                    "Invitación expirada automáticamente");
            }
        }
    }

    private InvitationResponse convertToResponse(SystemInvitation invitation) {
        if (invitation == null) {
            return null;
        }
        
        try {
            InvitationResponse response = new InvitationResponse();
            response.setId(invitation.getId());
            response.setSystemId(invitation.getSystemId());
            response.setInviterId(invitation.getInviterId());
            response.setInviteeEmail(invitation.getInviteeEmail());
            response.setInviteeId(invitation.getInviteeId());
            
            if (invitation.getRole() != null) {
                response.setRole(invitation.getRole().name());
            }
            if (invitation.getAccessType() != null) {
                response.setAccessType(invitation.getAccessType().name());
            }
            if (invitation.getStatus() != null) {
                response.setStatus(invitation.getStatus().name());
            }
            
            response.setExpiresAt(invitation.getExpiresAt());
            response.setAcceptedAt(invitation.getAcceptedAt());
            response.setRejectedAt(invitation.getRejectedAt());
            response.setCreatedAt(invitation.getCreatedAt());

            boolean isExpired = invitation.getExpiresAt() != null 
                && invitation.getExpiresAt().isBefore(LocalDateTime.now());
            response.setIsExpired(isExpired);

            if (invitation.getSystemId() != null) {
                try {
                    com.Datium.Datium.entity.System system = systemRepository.findById(invitation.getSystemId()).orElse(null);
                    if (system != null) {
                        response.setSystemName(system.getName());
                        response.setSystemImageUrl(system.getImageUrl());
                    }
                } catch (Exception e) {
                    java.lang.System.out.println("Error obteniendo sistema: " + e.getMessage());
                }
            }

            if (invitation.getInviterId() != null) {
                try {
                    User inviter = userRepository.findById(invitation.getInviterId()).orElse(null);
                    if (inviter != null) {
                        response.setInviterName(inviter.getName());
                        response.setInviterEmail(inviter.getEmail());
                    }
                } catch (Exception e) {
                    java.lang.System.out.println("Error obteniendo inviter: " + e.getMessage());
                }
            }

            if (invitation.getInviteeId() != null) {
                try {
                    User invitee = userRepository.findById(invitation.getInviteeId()).orElse(null);
                    if (invitee != null) {
                        response.setInviteeName(invitee.getName());
                    }
                } catch (Exception e) {
                    java.lang.System.out.println("Error obteniendo invitee: " + e.getMessage());
                }
            }

            response.setCanAccept(invitation.getStatus() == SystemInvitation.Status.pending && !isExpired);
            response.setCanReject(invitation.getStatus() == SystemInvitation.Status.pending);
            response.setCanCancel(invitation.getStatus() == SystemInvitation.Status.pending);
            response.setCanResend(invitation.getStatus() != SystemInvitation.Status.pending 
                && invitation.getStatus() != SystemInvitation.Status.accepted);

            return response;
        } catch (Exception e) {
            java.lang.System.out.println("Error en convertToResponse: " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }

    private void createAudit(Integer invitationId, String action, Integer performedBy, String details) {
        InvitationAudit audit = new InvitationAudit();
        audit.setInvitationId(invitationId);
        audit.setAction(action);
        audit.setPerformedBy(performedBy);
        audit.setDetails(details);
        auditRepository.save(audit);
    }
}

