package com.Datium.Datium.repository;

import com.Datium.Datium.entity.SystemInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SystemInvitationRepository extends JpaRepository<SystemInvitation, Integer> {
    
    List<SystemInvitation> findByInviteeEmailAndStatus(String email, SystemInvitation.Status status);
    
    List<SystemInvitation> findByInviterId(Integer inviterId);
    
    List<SystemInvitation> findBySystemId(Integer systemId);
    
    Optional<SystemInvitation> findBySystemIdAndInviteeEmailAndStatus(
        Integer systemId, String email, SystemInvitation.Status status);
    
    boolean existsBySystemIdAndInviteeEmailAndStatus(
        Integer systemId, String email, SystemInvitation.Status status);
    
    @Query("SELECT i FROM SystemInvitation i WHERE i.status = 'pending' AND i.expiresAt < :now")
    List<SystemInvitation> findExpiredInvitations(@Param("now") LocalDateTime now);
    
    @Query("SELECT COUNT(i) FROM SystemInvitation i WHERE i.inviteeEmail = :email AND i.status = 'pending'")
    Long countPendingByEmail(@Param("email") String email);
    
    List<SystemInvitation> findBySystemIdAndStatus(Integer systemId, SystemInvitation.Status status);
    
    @Query("SELECT i FROM SystemInvitation i WHERE i.inviteeId = :inviteeId AND i.status = :status")
    List<SystemInvitation> findByInviteeIdAndStatus(@Param("inviteeId") Integer inviteeId, @Param("status") SystemInvitation.Status status);
    
    List<SystemInvitation> findByInviteeEmail(String email);
    
    @Query("SELECT i FROM SystemInvitation i WHERE i.inviteeId = :inviteeId")
    List<SystemInvitation> findByInviteeId(@Param("inviteeId") Integer inviteeId);
}

