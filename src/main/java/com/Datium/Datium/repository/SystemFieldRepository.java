package com.Datium.Datium.repository;

import com.Datium.Datium.entity.SystemField;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SystemFieldRepository extends JpaRepository<SystemField, Integer> {
    List<SystemField> findBySystemIdOrderByOrderIndexAsc(Integer systemId);

    List<SystemField> findByTableIdOrderByOrderIndexAsc(Integer tableId);

    @Query("SELECT COUNT(f) FROM SystemField f WHERE f.systemId = :systemId AND f.required = true")
    Long countRequiredFieldsBySystemId(Integer systemId);

    Long countByTableId(Integer tableId);
}
