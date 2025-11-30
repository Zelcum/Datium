package com.Datium.Datium.repository;

import com.Datium.Datium.entity.SystemFieldLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SystemFieldLinkRepository extends JpaRepository<SystemFieldLink, Integer> {
    List<SystemFieldLink> findBySourceFieldId(Integer sourceFieldId);
    List<SystemFieldLink> findByTargetFieldId(Integer targetFieldId);
    List<SystemFieldLink> findBySourceSystemId(Integer sourceSystemId);
    List<SystemFieldLink> findByTargetSystemId(Integer targetSystemId);
    boolean existsBySourceFieldIdAndTargetFieldId(Integer sourceFieldId, Integer targetFieldId);
}


