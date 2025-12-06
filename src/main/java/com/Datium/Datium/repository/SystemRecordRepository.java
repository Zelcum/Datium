package com.Datium.Datium.repository;

import com.Datium.Datium.entity.SystemRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SystemRecordRepository extends JpaRepository<SystemRecord, Integer> {
    List<SystemRecord> findBySystemId(Integer systemId);

    List<SystemRecord> findByTableId(Integer tableId);

    @Query("SELECT COUNT(r) FROM SystemRecord r WHERE r.systemId = :systemId")
    Long countBySystemId(Integer systemId);

    @Query("SELECT COUNT(r) FROM SystemRecord r WHERE r.systemId = :systemId AND DATE(r.createdAt) = CURRENT_DATE")
    Long countTodayBySystemId(Integer systemId);
}
