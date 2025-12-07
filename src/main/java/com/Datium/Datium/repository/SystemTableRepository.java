package com.Datium.Datium.repository;

import com.Datium.Datium.entity.SystemTable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SystemTableRepository extends JpaRepository<SystemTable, Integer> {
    List<SystemTable> findBySystemId(Integer systemId);
    boolean existsBySystemIdAndName(Integer systemId, String name);
    long countBySystemId(Integer systemId);

}
