package com.Datium.Datium.repository;

import com.Datium.Datium.entity.SystemRelationship;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SystemRelationshipRepository extends JpaRepository<SystemRelationship, Integer> {
    List<SystemRelationship> findBySystemIdOrderByIdAsc(Integer systemId);

    @Modifying
    @Query("DELETE FROM SystemRelationship r WHERE r.fromTableId = ?1 OR r.toTableId = ?1")
    void deleteByTableId(Integer tableId);
}
