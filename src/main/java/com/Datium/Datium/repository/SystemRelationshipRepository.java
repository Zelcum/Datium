package com.Datium.Datium.repository;

import com.Datium.Datium.entity.SystemRelationship;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SystemRelationshipRepository extends JpaRepository<SystemRelationship, Integer> {
    List<SystemRelationship> findBySystemId(Integer systemId);
    List<SystemRelationship> findByFromTableId(Integer fromTableId);
    List<SystemRelationship> findByToTableId(Integer toTableId);
    
    void deleteByFromTableId(Integer fromTableId);
    void deleteByToTableId(Integer toTableId);
}
