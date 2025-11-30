package com.Datium.Datium.repository;

import com.Datium.Datium.entity.SystemFieldTransferLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SystemFieldTransferLogRepository extends JpaRepository<SystemFieldTransferLog, Integer> {
    List<SystemFieldTransferLog> findBySourceSystemId(Integer sourceSystemId);
    List<SystemFieldTransferLog> findByTargetSystemId(Integer targetSystemId);
}


