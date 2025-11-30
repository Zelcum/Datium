package com.Datium.Datium.repository;

import com.Datium.Datium.entity.InvitationAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InvitationAuditRepository extends JpaRepository<InvitationAudit, Integer> {
    List<InvitationAudit> findByInvitationId(Integer invitationId);
    List<InvitationAudit> findByPerformedBy(Integer performedBy);
}

