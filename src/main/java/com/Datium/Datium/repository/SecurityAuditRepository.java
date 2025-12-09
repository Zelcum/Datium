package com.Datium.Datium.repository;

import com.Datium.Datium.entity.SecurityAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SecurityAuditRepository extends JpaRepository<SecurityAudit, Integer> {
    List<SecurityAudit> findBySystemIdOrderByCreatedAtDesc(Integer systemId);

    @Query("SELECT s FROM SecurityAudit s WHERE s.systemId = :systemId AND " +
           "(LOWER(s.event) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(s.details) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY s.createdAt DESC")
    List<SecurityAudit> searchBySystemId(@Param("systemId") Integer systemId, @Param("search") String search);

    @Query("SELECT s FROM SecurityAudit s WHERE s.systemId = :systemId " +
           "AND (:search IS NULL OR :search = '' OR " +
           "LOWER(s.event) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(s.details) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:dateFrom IS NULL OR s.createdAt >= :dateFrom) " +
           "AND (:dateTo IS NULL OR s.createdAt <= :dateTo) " +
           "AND (:userId IS NULL OR s.userId = :userId) " +
           "AND (:severity IS NULL OR s.severity = :severity) " +
           "ORDER BY s.createdAt DESC")
    List<SecurityAudit> filterBySystemId(@Param("systemId") Integer systemId,
                                          @Param("search") String search,
                                          @Param("dateFrom") LocalDateTime dateFrom,
                                          @Param("dateTo") LocalDateTime dateTo,
                                          @Param("userId") Integer userId,
                                          @Param("severity") SecurityAudit.Severity severity);

    @Query("SELECT COUNT(s) FROM SecurityAudit s WHERE s.systemId = :systemId")
    Long countBySystemId(@Param("systemId") Integer systemId);

    @Query("SELECT COUNT(s) FROM SecurityAudit s WHERE s.systemId = :systemId AND s.severity = :severity")
    Long countBySystemIdAndSeverity(@Param("systemId") Integer systemId, @Param("severity") SecurityAudit.Severity severity);

    List<SecurityAudit> findBySystemIdInOrderByCreatedAtDesc(List<Integer> systemIds);

    @Query("SELECT s FROM SecurityAudit s WHERE s.systemId IN :systemIds AND " +
           "(LOWER(s.event) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(s.details) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY s.createdAt DESC")
    List<SecurityAudit> searchBySystemIdIn(@Param("systemIds") List<Integer> systemIds, @Param("search") String search);

    @Query("SELECT s FROM SecurityAudit s WHERE s.systemId IN :systemIds " +
           "AND (:search IS NULL OR :search = '' OR " +
           "LOWER(s.event) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(s.details) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:dateFrom IS NULL OR s.createdAt >= :dateFrom) " +
           "AND (:dateTo IS NULL OR s.createdAt <= :dateTo) " +
           "AND (:userId IS NULL OR s.userId = :userId) " +
           "AND (:severity IS NULL OR s.severity = :severity) " +
           "ORDER BY s.createdAt DESC")
    List<SecurityAudit> filterBySystemIdIn(@Param("systemIds") List<Integer> systemIds,
                                          @Param("search") String search,
                                          @Param("dateFrom") LocalDateTime dateFrom,
                                          @Param("dateTo") LocalDateTime dateTo,
                                          @Param("userId") Integer userId,
                                          @Param("severity") SecurityAudit.Severity severity);
}

