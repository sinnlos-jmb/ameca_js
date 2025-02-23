//delete
async function deletePeriod() {
    const period = document.getElementById('period-select').value;
    const response = await fetch(`/delete?period=${period}`);
    const data = await response.json();
    const tableBody = document.querySelector('#data-table tbody');
    tableBody.innerHTML = '';
    const tr = document.createElement('tr');
    document.href="/data?period=${data.period}";
    tr.innerHTML ="<td colspan='12' class='td_msg'> "+data.msg+".</td></tr>";
    tableBody.appendChild(tr);
    }



//download
async function downExc() {
    const period = document.getElementById('period-select').value;
    const response = await fetch(`/excel?period=${period}`);

    const data = await response.json();
    
    if (data.success) {
        alert("Planilla Excel generada correctamente! Click OK para descargar.");
        window.location.href = data.fileUrl; // Trigger download
        } 
    else { alert("Error al generar la planilla Excel: " + data.message); }
    
    const tableBody = document.querySelector('#data-table tbody');
    tableBody.innerHTML = '';
    const tr = document.createElement('tr');
    tr.innerHTML ="<td colspan='12' class='td_msg'> Descargando archivo.</td></tr>";
    tableBody.appendChild(tr);
    }



//insert
async function insertPeriod() {
    const period = document.getElementById('period-select').value;
    const period_dest = document.getElementById('period-dest').value;
    const porc_bi = document.getElementById('porc_bi').value;
    const porc_compras = document.getElementById('porc_compras').value;
    const perc_iva = document.getElementById('perc_iva').value;
    const perc_iibb = document.getElementById('perc_iibb').value;
    const response = await fetch(`/insert?period=${period}&period_dest=${period_dest}&porc_bi=${porc_bi}&porc_compras=${porc_compras}&perc_iva=${perc_iva}&perc_iibb=${perc_iibb}`);
    const data = await response.json();
    document.querySelector("#data-table thead tr th:nth-child(3)").style.left = "0px";  
    const tableBody = document.querySelector('#data-table tbody');
    
    tableBody.innerHTML = '';
    const tr = document.createElement('tr');
    tr.innerHTML ="<td colspan='12' class='td_msg'> "+data.msg+".</td></tr>";
    tableBody.appendChild(tr);
    }


//data
async function fetchData() {
    const period = document.getElementById('period-select').value;
    const response = await fetch(`/data?period=${period}`);
    const data = await response.json();
    const tableBody = document.querySelector('#data-table tbody');
    tableBody.innerHTML = '';
    const test=Array.isArray(data);
    if (data.length>0) {

        const thirdTH = document.querySelector("#data-table thead tr th:nth-child(3)");

        const int_l=new Intl.NumberFormat('es-AR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                        });
        data.forEach(row => {
            const tr = document.createElement('tr');
            tr.className='tr3';
            const bi = row.base_imponible;
            const saldo_iibb=row.saldo_iibb;
            const saldo_iva=row.saldo_iva;
            const alic_iva=row.alicuota_iva;
            const alic_iibb=row.alicuota_iibb;
            const debito_iva=bi*alic_iva/100;
            const debito_iibb=bi*alic_iibb/100;
            const compra_iva=parseFloat(row.compra_iva);
            const iva_credito =compra_iva*alic_iva/100; 
            const venta_total = parseFloat(bi) + debito_iva;
            console.log("venta total: "+venta_total);
            const compra_total = compra_iva + iva_credito;
            
            tr.innerHTML = `
                <td class="td3">${row.id_establecimiento}</td>
                <td class="td3">${row.nro_cuit}</td>
                <td class="td3">${row.nombre_responsable}</td>
                <td class="td3">${row.direccion_establecimiento}</td>
                <td class="td3">${row.id_zona}</td>
                <td class="td3">${row.periodo}</td>
                <td class="td3">${alic_iva}</td>
                <td class="td3">${alic_iibb}</td>
                <td class="td3">${int_l.format(bi)}</td>
                <td class="td3">${int_l.format(debito_iva)}</td>
                <td class="td3">${int_l.format(venta_total)}</td>
                <td class="td3">${int_l.format(compra_iva)}</td>
                <td class="td3">${int_l.format(iva_credito)}</td>
                <td class="td3">${int_l.format(compra_total)}</td>
                <td class="td3">${int_l.format(row.percepcion_iva)}</td>
                <td class="td3" style="background-color:#afeeeea1;">${int_l.format(saldo_iva)}</td>
                <td class="td3">${int_l.format(debito_iibb)}</td>
                <td class="td3">${int_l.format(row.percepcion_iibb)}</td>
                <td class="td3" style="background-color:#ffe4c4a1;">${int_l.format(saldo_iibb)}</td>

                <td class="td3">${int_l.format(saldo_iva)}</td>
                <td class="td3">${int_l.format(saldo_iibb)}</td>
            `;
            tableBody.appendChild(tr);
            });
        }
    else {
        const pr_ht=document.querySelector("#data-table thead tr th:nth-child(3)");
        pr_ht.style.left = "0px";
        const tr = document.createElement('tr');
        tr.innerHTML ="<td colspan='12' class='td_msg'> No se encontraron registros para el periodo.</td></tr>";
        tableBody.appendChild(tr);
        }
    
    }