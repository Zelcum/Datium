package com.Datium.Datium.repository;

import com.Datium.Datium.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Integer> {
    List<AuditLog> findBySystemIdOrderByCreatedAtDesc(Integer systemId);

    @Query("SELECT a FROM AuditLog a WHERE a.systemId = :systemId AND " +
           "(LOWER(a.action) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.details) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.ip) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY a.createdAt DESC")
    List<AuditLog> searchBySystemId(@Param("systemId") Integer systemId, @Param("search") String search);

    @Query("SELECT a FROM AuditLog a WHERE a.systemId = :systemId " +
           "AND (:search IS NULL OR :search = '' OR " +
           "LOWER(a.action) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.details) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.ip) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:dateFrom IS NULL OR a.createdAt >= :dateFrom) " +
           "AND (:dateTo IS NULL OR a.createdAt <= :dateTo) " +
           "AND (:userId IS NULL OR a.userId = :userId) " +
           "ORDER BY a.createdAt DESC")
    List<AuditLog> filterBySystemId(@Param("systemId") Integer systemId,
                                     @Param("search") String search,
                                     @Param("dateFrom") LocalDateTime dateFrom,
                                     @Param("dateTo") LocalDateTime dateTo,
                                     @Param("userId") Integer userId);

    @Query("SELECT COUNT(a) FROM AuditLog a WHERE a.systemId = :systemId")
    Long countBySystemId(@Param("systemId") Integer systemId);

    List<AuditLog> findBySystemIdInOrderByCreatedAtDesc(List<Integer> systemIds);

    @Query("SELECT a FROM AuditLog a WHERE a.systemId IN :systemIds AND " +
           "(LOWER(a.action) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.details) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.ip) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY a.createdAt DESC")
    List<AuditLog> searchBySystemIdIn(@Param("systemIds") List<Integer> systemIds, @Param("search") String search);

    @Query("SELECT a FROM AuditLog a WHERE a.systemId IN :systemIds " +
           "AND (:search IS NULL OR :search = '' OR " +
           "LOWER(a.action) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.details) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.ip) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:dateFrom IS NULL OR a.createdAt >= :dateFrom) " +
           "AND (:dateTo IS NULL OR a.createdAt <= :dateTo) " +
           "AND (:userId IS NULL OR a.userId = :userId) " +
           "ORDER BY a.createdAt DESC")
    List<AuditLog> filterBySystemIdIn(@Param("systemIds") List<Integer> systemIds,
                                     @Param("search") String search,
                                     @Param("dateFrom") LocalDateTime dateFrom,
                                     @Param("dateTo") LocalDateTime dateTo,
                                     @Param("userId") Integer userId);
}


