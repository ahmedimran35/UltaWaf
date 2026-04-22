from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from datetime import datetime, timedelta
import csv
import io
from backend.models.database import get_db, RequestLog, AdminUser
# Lazy import for get_current_admin
def get_current_admin():
    from backend.main import get_current_admin as gca
    return gca
# from backend.main import get_current_admin

router = APIRouter()

@router.get("/csv")
async def export_logs_csv(
    hours: int = Query(24, ge=1, le=168),
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    since = datetime.utcnow() - timedelta(hours=hours)
    
    result = await db.execute(
        select(RequestLog)
        .where(RequestLog.timestamp >= since)
        .order_by(desc(RequestLog.timestamp))
        .limit(1000)
    )
    logs = result.scalars().all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(["ID", "Timestamp", "IP", "Method", "Path", "Blocked", "Attack Type", "Threat Score", "Country"])
    
    for log in logs:
        writer.writerow([
            log.id,
            log.timestamp.isoformat(),
            log.client_ip,
            log.method,
            log.path,
            log.blocked,
            log.attack_type,
            log.threat_score,
            log.country
        ])
    
    content = output.getvalue()
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=waf_logs_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"}
    )

@router.get("/pdf")
async def export_logs_html_report(
    hours: int = Query(24, ge=1, le=168),
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    """Generates an HTML report that is optimized for PDF printing."""
    since = datetime.utcnow() - timedelta(hours=hours)
    
    result = await db.execute(
        select(RequestLog)
        .where(RequestLog.timestamp >= since)
        .order_by(desc(RequestLog.timestamp))
        .limit(100)
    )
    logs = result.scalars().all()
    
    html_content = f"""
    <html>
    <head>
        <title>UltraShield WAF Security Report</title>
        <style>
            body {{ font-family: sans-serif; padding: 40px; color: #333; }}
            h1 {{ color: #2563eb; border-bottom: 2px solid #eee; padding-bottom: 10px; }}
            .summary {{ background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
            th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #eee; }}
            th {{ background: #f1f5f9; }}
            .blocked {{ color: #ef4444; font-weight: bold; }}
            .allowed {{ color: #22c55e; }}
        </style>
    </head>
    <body>
        <h1>Security Analysis Report</h1>
        <div class="summary">
            <p><strong>Period:</strong> Last {hours} hours</p>
            <p><strong>Generated At:</strong> {datetime.utcnow().isoformat()}</p>
            <p><strong>Requests Analyzed:</strong> {len(logs)}</p>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Timestamp</th>
                    <th>IP Address</th>
                    <th>Method/Path</th>
                    <th>Status</th>
                    <th>Attack Type</th>
                </tr>
            </thead>
            <tbody>
    """
    
    for log in logs:
        status = f'<span class="blocked">BLOCKED</span>' if log.blocked else f'<span class="allowed">ALLOWED</span>'
        html_content += f"""
                <tr>
                    <td>{log.timestamp.strftime('%H:%M:%S')}</td>
                    <td>{log.client_ip}</td>
                    <td>{log.method} {log.path[:30]}...</td>
                    <td>{status}</td>
                    <td>{log.attack_type or "Clean"}</td>
                </tr>
        """
        
    html_content += """
            </tbody>
        </table>
    </body>
    </html>
    """
    
    return Response(content=html_content, media_type="text/html")

reports_router = router